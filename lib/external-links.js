/**
 * @file
 * Opens external links in component rich text in a new tab.
 *
 * Canvas rich text formats are locked and strip the target attribute, so this
 * is applied on the front end instead. Only links to other hosts are changed;
 * links within the site keep opening in the same tab.
 */

((Drupal, once) => {
  /**
   * Rich text containers rendered by theme components.
   *
   * - .rich-text: Text component (also used inside Pricing card).
   * - .cta__text: CTA component.
   */
  const SELECTOR = ".rich-text a[href], .cta__text a[href]";

  /**
   * Checks whether a link points to another website.
   *
   * @param {HTMLAnchorElement} link
   *   The link element.
   *
   * @return {boolean}
   *   TRUE for http(s) links to a different host.
   */
  const isExternal = (link) => {
    try {
      const url = new URL(link.getAttribute("href"), window.location.href);
      return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== window.location.hostname;
    } catch {
      return false;
    }
  };

  Drupal.behaviors.ajjExternalLinks = {
    attach(context) {
      once("ajj-external-links", SELECTOR, context).forEach((link) => {
        if (!isExternal(link) || link.hasAttribute("target")) {
          return;
        }

        link.setAttribute("target", "_blank");

        const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
        rel.add("noopener");
        rel.add("noreferrer");
        link.setAttribute("rel", [...rel].join(" "));

        // Tell screen reader users the link opens a new tab.
        const notice = document.createElement("span");
        notice.className = "sr-only";
        notice.textContent = ` ${Drupal.t("(opens in a new tab)")}`;
        link.append(notice);
      });
    },
  };
})(Drupal, once);
