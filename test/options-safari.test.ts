import { describe, expect, it, vi } from "vitest";
import { installBrowserMock } from "./browser-mock.js";

document.body.innerHTML = `<main><section id="notifications-section"></section></main>`;
installBrowserMock();
vi.stubGlobal("navigator", {
  vendor: "Apple Computer, Inc.",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
});
await import("../src/js/options.js");

describe("options page on Safari", () => {
  it("hides the notifications section", () => {
    expect(document.querySelector("#notifications-section")?.style.display).toBe("none");
  });

  it("adds a settings hint directly after the notifications section", () => {
    const notificationsSection = document.querySelector("#notifications-section");
    const hint = document.querySelector(".settings-hint");
    expect(hint).not.toBeNull();
    expect(notificationsSection?.nextElementSibling).toBe(hint);
    expect(hint?.textContent).toBe(
      "Note: Make sure to allow access to Amazon domains in the Safari Extensions Preferences to enable all features.",
    );
  });
});
