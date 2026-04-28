import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function fireKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires handler after G then matching key", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("g");
    fireKey("t");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire if G timeout expires before second key", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("g");
    vi.advanceTimersByTime(1001);
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
  });

  it("fires ? handler immediately without G prefix", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "?": handler }));
    fireKey("?");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("fires Escape handler immediately without G prefix", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ Escape: handler }));
    fireKey("Escape");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("skips handler when focus is in an input", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("skips handler when focus is in a textarea", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("skips handler when focus is in a select", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    const select = document.createElement("select");
    document.body.appendChild(select);
    select.focus();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(select);
  });

  it("skips handler when focus is in a contenteditable element", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true"); // IDL property not reflected in jsdom; use attribute directly
    document.body.appendChild(div);
    div.focus();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("suppresses ? handler when focus is in an input", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "?": handler }));
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireKey("?");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("removes listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ t: handler }));
    unmount();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
  });

  it("treats G and g as the same trigger", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("G");
    fireKey("t");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("is case-insensitive for the second key", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("g");
    fireKey("T");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("resets after unregistered second key and accepts a fresh G-sequence", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("g");
    fireKey("z"); // unrecognised — resets the pending state
    fireKey("t"); // no pending G, should NOT fire
    expect(handler).not.toHaveBeenCalled();
    // A fresh G-sequence SHOULD fire
    fireKey("g");
    fireKey("t");
    expect(handler).toHaveBeenCalledOnce();
  });
});
