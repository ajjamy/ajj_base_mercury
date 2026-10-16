import { ComponentType, ComponentInstance } from "../../lib/component.js";

class MegaMenu extends ComponentInstance {
  init() {
    this.onClick = (event) => {
      const toggle = event.target.closest("[data-mega-menu-item-toggle]");
      if (!toggle || !this.el.contains(toggle)) return;

      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      this.closeItems(toggle);
      this.setItemOpen(toggle, !isOpen);
    };

    this.onKeydown = (event) => {
      if (event.key !== "Escape") return;

      const openToggle = this.el.querySelector('[data-mega-menu-item-toggle][aria-expanded="true"]');
      if (openToggle) {
        this.setItemOpen(openToggle, false);
        openToggle.focus();
      }
    };

    this.onDocumentClick = (event) => {
      if (!this.el.contains(event.target)) this.closeItems();
    };

    this.el.addEventListener("click", this.onClick);
    this.el.addEventListener("keydown", this.onKeydown);
    document.addEventListener("click", this.onDocumentClick);
    this.el.classList.add("is-enhanced");
  }

  setItemOpen(toggle, isOpen) {
    const dropdown = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!dropdown) return;

    toggle.setAttribute("aria-expanded", String(isOpen));
    dropdown.classList.toggle("is-open", isOpen);
  }

  closeItems(except = null) {
    this.el.querySelectorAll('[data-mega-menu-item-toggle][aria-expanded="true"]').forEach((toggle) => {
      if (toggle !== except) this.setItemOpen(toggle, false);
    });
  }

  remove() {
    this.el.removeEventListener("click", this.onClick);
    this.el.removeEventListener("keydown", this.onKeydown);
    document.removeEventListener("click", this.onDocumentClick);
  }
}

new ComponentType(MegaMenu, "megaMenu", "[data-mega-menu]");
