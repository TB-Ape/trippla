// Patch HTMLElement.prototype.focus so that jsdom correctly focuses
// contenteditable elements. jsdom does not treat contentEditable='true' (set as
// a JS property) as a focusable element, because it only checks the DOM attribute.
// This patch grants tabIndex=-1 for such elements and removes it on blur,
// making document.activeElement reflect the contenteditable element as browsers do.
const originalFocus = HTMLElement.prototype.focus;

HTMLElement.prototype.focus = function (options?: FocusOptions) {
  const isEditable =
    (this as HTMLElement).contentEditable === "true" ||
    this.getAttribute("contenteditable") === "true";

  if (isEditable && !this.hasAttribute("tabindex")) {
    this.setAttribute("tabindex", "-1");
    // Remove tabindex when the element loses focus so it doesn't linger
    this.addEventListener("blur", () => this.removeAttribute("tabindex"), { once: true });
  }

  originalFocus.call(this, options);
};
