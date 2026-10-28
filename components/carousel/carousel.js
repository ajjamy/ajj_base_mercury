import { ComponentType, ComponentInstance } from "../../lib/component.js";
import currentlyInCanvasEditor from "../../lib/currentlyInCanvasEditor.js";

// Used to give each carousel's slides container a unique ID for aria-controls.
let idCounter = 0;

/**
 * Follows the WAI-ARIA APG carousel pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
 */
class Carousel extends ComponentInstance {
  #index = 0;
  #isRotating = false;
  #isPausedByHover = false;
  #timer = 0;

  init() {
    if (currentlyInCanvasEditor()) {
      // Leave all slides stacked so every one of them can be edited.
      return;
    }

    // A view placed in the slot wraps its rows in `.view-content`, so its rows
    // become the slides. Otherwise each child of the track is a slide.
    const track = this.el.querySelector(".carousel--track");
    this.slidesContainer = track.querySelector(".view-content") ?? track;
    this.slides = Array.from(this.slidesContainer.children);

    if (this.slides.length < 2) {
      return;
    }

    this.controls = this.el.querySelector(".carousel--controls");
    this.prevButton = this.el.querySelector(".carousel--prev");
    this.nextButton = this.el.querySelector(".carousel--next");
    this.rotationButton = this.el.querySelector(".carousel--rotation");
    this.interval = (parseInt(this.el.dataset.interval, 10) || 7) * 1000;

    this.slidesContainer.id ||= `carousel-slides-${++idCounter}`;
    this.slidesContainer.classList.add("carousel--slides");

    this.slides.forEach((slide, i) => {
      slide.classList.add("carousel--slide");
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", Drupal.t("slide"));
      slide.setAttribute(
        "aria-label",
        Drupal.t("@current of @total", {
          "@current": i + 1,
          "@total": this.slides.length,
        }),
      );
    });

    [this.prevButton, this.nextButton].forEach((button) => {
      button.setAttribute("aria-controls", this.slidesContainer.id);
    });

    this.prevButton.addEventListener("click", () => {
      this.isRotating = false;
      this.goTo(this.#index - 1);
    });

    this.nextButton.addEventListener("click", () => {
      this.isRotating = false;
      this.goTo(this.#index + 1);
    });

    this.buildDots();
    this.initRotation();

    this.goTo(0);
    this.controls.hidden = false;
    this.el.classList.add("carousel--js");

    // Enable the fade only after the first slide is shown, so the page doesn't
    // load with a fade-in.
    void this.el.offsetHeight;
    this.el.classList.add("carousel--animate");
  }

  buildDots() {
    const dotsContainer = this.el.querySelector(".carousel--dots");

    if (!dotsContainer) {
      this.dots = [];
      return;
    }

    this.dots = this.slides.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel--dot";
      dot.setAttribute("aria-controls", this.slidesContainer.id);
      dot.setAttribute("aria-label", Drupal.t("Go to slide @number", { "@number": i + 1 }));
      dot.addEventListener("click", () => {
        this.isRotating = false;
        this.goTo(i);
      });
      dotsContainer.append(dot);
      return dot;
    });
  }

  initRotation() {
    if (!this.rotationButton) {
      return;
    }

    this.rotationButton.addEventListener("click", () => {
      this.isRotating = !this.isRotating;
    });

    // Keyboard focus anywhere in the carousel (other than the rotation button)
    // stops rotation until the user restarts it.
    this.el.addEventListener("focusin", (e) => {
      if (!this.rotationButton.contains(e.target)) {
        this.isRotating = false;
      }
    });

    // Hovering pauses rotation only while the pointer is over the carousel.
    this.el.addEventListener("mouseenter", () => {
      this.#isPausedByHover = true;
      this.scheduleNext();
    });

    this.el.addEventListener("mouseleave", () => {
      this.#isPausedByHover = false;
      this.scheduleNext();
    });

    this.visibilityHandler = () => this.scheduleNext();
    document.addEventListener("visibilitychange", this.visibilityHandler);

    this.isRotating = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  set isRotating(value) {
    this.#isRotating = value;

    // Announce slide changes only when the user caused them.
    this.slidesContainer.setAttribute("aria-live", value ? "off" : "polite");

    if (this.rotationButton) {
      this.rotationButton.setAttribute("aria-label", value ? Drupal.t("Stop automatic slide show") : Drupal.t("Start automatic slide show"));
      this.rotationButton.querySelector(".carousel--icon-pause").hidden = !value;
      this.rotationButton.querySelector(".carousel--icon-play").hidden = value;
    }

    this.scheduleNext();
  }

  get isRotating() {
    return this.#isRotating;
  }

  goTo(index) {
    const total = this.slides.length;
    this.#index = (index + total) % total;

    this.slides.forEach((slide, i) => {
      const isActive = i === this.#index;
      slide.classList.toggle("carousel--slide-active", isActive);
      // Keeps links in hidden slides out of the tab order and hidden slides
      // out of the accessibility tree.
      slide.inert = !isActive;
    });

    this.dots.forEach((dot, i) => {
      dot.setAttribute("aria-current", i === this.#index ? "true" : "false");
    });

    this.scheduleNext();
  }

  scheduleNext() {
    window.clearTimeout(this.#timer);

    if (this.#isRotating && !this.#isPausedByHover && !document.hidden) {
      this.#timer = window.setTimeout(() => this.goTo(this.#index + 1), this.interval);
    }
  }

  remove() {
    window.clearTimeout(this.#timer);

    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
  }
}

new ComponentType(Carousel, "carousel", ".carousel");
