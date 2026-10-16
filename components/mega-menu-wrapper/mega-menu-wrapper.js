import { ComponentType, ComponentInstance } from "../../lib/component.js";

class MegaMenuWrapper extends ComponentInstance {
  init() {
    this.toggle = this.el.querySelector("[data-mega-menu-toggle]");
    this.pane = this.el.querySelector("[data-mega-menu-pane]");
    this.desktop = window.matchMedia("(min-width: 48rem)");

    this.onToggle = () => this.setPaneOpen(!this.pane.classList.contains("is-open"));
    this.onClick = (event) => {
      const itemToggle = event.target.closest("[data-mega-menu-item-toggle]");
      if (itemToggle && this.el.contains(itemToggle)) {
        this.toggleItem(itemToggle);
      }
    };
    this.onKeydown = (event) => {
      if (event.key !== "Escape") return;

      const openItemToggle = this.el.querySelector('[data-mega-menu-item-toggle][aria-expanded="true"]');
      if (openItemToggle) {
        this.setItemOpen(openItemToggle, false);
        openItemToggle.focus();
      } else if (!this.desktop.matches && this.pane.classList.contains("is-open")) {
        this.setPaneOpen(false);
        this.toggle.focus();
      }
    };
    this.onDocumentClick = (event) => {
      if (!this.el.contains(event.target)) this.closeItems();
    };
    this.onBreakpointChange = (event) => {
      this.setPaneOpen(event.matches);
      this.closeItems();
    };

    this.toggle.addEventListener("click", this.onToggle);
    this.el.addEventListener("click", this.onClick);
    this.el.addEventListener("keydown", this.onKeydown);
    document.addEventListener("click", this.onDocumentClick);
    this.desktop.addEventListener("change", this.onBreakpointChange);
    this.el.classList.add("is-enhanced");
    this.setPaneOpen(this.desktop.matches);
  }

  setPaneOpen(isOpen) {
    this.pane.classList.toggle("is-open", isOpen);
    this.pane.classList.toggle("is-collapsed", !isOpen && !this.desktop.matches);
    this.toggle.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen) this.closeItems();
  }

  toggleItem(toggle) {
    const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";
    const currentItem = toggle.closest("[data-mega-menu-item]");
    this.el.querySelectorAll('[data-mega-menu-item-toggle][aria-expanded="true"]').forEach((otherToggle) => {
      if (otherToggle !== toggle && !currentItem.contains(otherToggle)) {
        this.setItemOpen(otherToggle, false);
      }
    });
    this.setItemOpen(toggle, shouldOpen);
  }

  setItemOpen(toggle, isOpen) {
    const dropdown = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!dropdown) return;

    toggle.setAttribute("aria-expanded", String(isOpen));
    dropdown.classList.toggle("is-open", isOpen);
  }

  closeItems() {
    this.el.querySelectorAll('[data-mega-menu-item-toggle][aria-expanded="true"]').forEach((toggle) => {
      this.setItemOpen(toggle, false);
    });
  }

  remove() {
    this.toggle.removeEventListener("click", this.onToggle);
    this.el.removeEventListener("click", this.onClick);
    this.el.removeEventListener("keydown", this.onKeydown);
    document.removeEventListener("click", this.onDocumentClick);
    this.desktop.removeEventListener("change", this.onBreakpointChange);
  }
}

new ComponentType(MegaMenuWrapper, "megaMenuWrapper", "[data-mega-menu-wrapper]");
