import { ComponentType, ComponentInstance } from "../../lib/component.js";

class MegaMenu extends ComponentInstance {
  init() {
    this.desktop = window.matchMedia("(min-width: 62rem)");
    this.menuItems = Array.from(this.el.querySelectorAll("[data-mega-menu-item]"));
    this.onClick = (event) => {
      const toggle = event.target.closest("[data-mega-menu-item-toggle]");
      if (!toggle || !this.el.contains(toggle)) return;

      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (this.desktop.matches) this.closeItems(toggle);
      this.setItemOpen(toggle, !isOpen);
    };

    this.onKeydown = (event) => {
      if (event.key !== "Escape" || !this.desktop.matches) return;

      const openToggle = this.el.querySelector('[data-mega-menu-item-toggle][aria-expanded="true"]');
      if (openToggle) {
        this.setItemOpen(openToggle, false);
        openToggle.focus();
      }
    };

    this.onDocumentClick = (event) => {
      if (this.desktop.matches && !this.el.contains(event.target)) this.closeItems();
    };
    this.onPointerEnter = (event) => {
      if (!this.desktop.matches || event.pointerType === "touch") return;

      const toggle = event.currentTarget.querySelector("[data-mega-menu-item-toggle]");
      if (!toggle) {
        this.closeItems();
        return;
      }

      this.closeItems(toggle);
      this.setItemOpen(toggle, true);
    };
    this.onPointerLeave = (event) => {
      const toggle = event.currentTarget.querySelector("[data-mega-menu-item-toggle]");
      if (toggle && !event.currentTarget.contains(document.activeElement)) {
        this.setItemOpen(toggle, false);
      }
    };
    this.onFocusIn = (event) => {
      if (!this.desktop.matches) return;

      const item = event.target.closest("[data-mega-menu-item]");
      const toggle = item?.querySelector("[data-mega-menu-item-toggle]");
      if (toggle) {
        this.closeItems(toggle);
        this.setItemOpen(toggle, true);
      }
    };
    this.onFocusOut = (event) => {
      if (!this.desktop.matches) return;

      const item = event.target.closest("[data-mega-menu-item]");
      const toggle = item?.querySelector("[data-mega-menu-item-toggle]");
      if (toggle && !item.contains(event.relatedTarget)) {
        this.setItemOpen(toggle, false);
      }
    };
    this.onBreakpointChange = () => this.closeItems();
    this.onResize = () => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.el.querySelectorAll("[data-mega-menu-dropdown].is-open").forEach((dropdown) => this.positionDropdown(dropdown));
      });
    };

    this.el.addEventListener("click", this.onClick);
    this.el.addEventListener("keydown", this.onKeydown);
    document.addEventListener("click", this.onDocumentClick);
    this.el.addEventListener("focusin", this.onFocusIn);
    this.el.addEventListener("focusout", this.onFocusOut);
    this.desktop.addEventListener("change", this.onBreakpointChange);
    window.addEventListener("resize", this.onResize);
    this.menuItems.forEach((item) => {
      item.addEventListener("pointerenter", this.onPointerEnter);
      item.addEventListener("pointerleave", this.onPointerLeave);
    });
    this.el.classList.add("is-enhanced");
    this.onBreakpointChange(this.desktop);
  }

  setItemOpen(toggle, isOpen) {
    const dropdown = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!dropdown) return;

    toggle.setAttribute("aria-expanded", String(isOpen));
    dropdown.classList.toggle("is-open", isOpen);
    if (isOpen) {
      this.positionDropdown(dropdown);
    } else {
      this.resetDropdown(dropdown);
    }
  }

  // Desktop dropdowns open directly below their menu item (no hover gap) and
  // are capped to the window width. Mega panels are centered in the window;
  // simple dropdowns line up under their parent item.
  positionDropdown(dropdown) {
    this.resetDropdown(dropdown);
    if (!this.desktop.matches) return;

    const gutter = 16;
    const viewportWidth = document.documentElement.clientWidth;
    dropdown.style.maxWidth = `${viewportWidth - gutter * 2}px`;

    const item = dropdown.closest("[data-mega-menu-item]");
    const parent = dropdown.offsetParent;
    if (item && parent) {
      const parentTop = parent.getBoundingClientRect().top + parent.clientTop;
      dropdown.style.top = `${item.getBoundingClientRect().bottom - parentTop}px`;
    }

    const rect = dropdown.getBoundingClientRect();
    let shift;
    if (item && dropdown.classList.contains("mega-menu-item__dropdown--simple")) {
      // Line up under the parent item, nudged back in if it would overflow.
      let targetLeft = item.getBoundingClientRect().left;
      targetLeft = Math.min(targetLeft, viewportWidth - gutter - rect.width);
      targetLeft = Math.max(targetLeft, gutter);
      shift = targetLeft - rect.left;
    } else {
      shift = (viewportWidth - rect.width) / 2 - rect.left;
    }
    dropdown.style.left = `${dropdown.offsetLeft + shift}px`;
  }

  resetDropdown(dropdown) {
    dropdown.style.removeProperty("top");
    dropdown.style.removeProperty("left");
    dropdown.style.removeProperty("max-width");
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
    this.el.removeEventListener("focusin", this.onFocusIn);
    this.el.removeEventListener("focusout", this.onFocusOut);
    this.desktop.removeEventListener("change", this.onBreakpointChange);
    window.removeEventListener("resize", this.onResize);
    cancelAnimationFrame(this.resizeFrame);
    this.menuItems.forEach((item) => {
      item.removeEventListener("pointerenter", this.onPointerEnter);
      item.removeEventListener("pointerleave", this.onPointerLeave);
    });
  }
}

new ComponentType(MegaMenu, "megaMenu", "[data-mega-menu]");
