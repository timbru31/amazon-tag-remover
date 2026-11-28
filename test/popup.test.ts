import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStorageMock } from "./browser-mock.js";

const defaults = { aggressiveMode: false, allowedTags: [], replacementTag: "" };

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<button id="copy" type="button"></button><p id="status"></p>';
  writeText = vi.fn(async () => undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
});

async function clickCopy(tabUrl: string | undefined): Promise<string | null | undefined> {
  vi.stubGlobal("browser", {
    storage: { local: createStorageMock({ ...defaults }) },
    tabs: { query: vi.fn(async () => [{ url: tabUrl }]) },
  });
  await import("../src/js/popup.js");
  document.querySelector<HTMLButtonElement>("#copy")?.click();
  await vi.waitFor(() => expect(document.querySelector("#status")?.textContent).not.toBe(""));
  return document.querySelector("#status")?.textContent;
}

describe("popup", () => {
  it("copies the sanitized URL of the active tab", async () => {
    const status = await clickCopy("https://www.amazon.de/dp/B000000000?tag=foo-21");
    expect(writeText).toHaveBeenCalledWith("https://www.amazon.de/dp/B000000000");
    expect(status).toBe("Copied without tracking tag.");
  });

  it("copies an already clean URL and says no tag was found", async () => {
    const status = await clickCopy("https://www.amazon.de/dp/B000000000");
    expect(writeText).toHaveBeenCalledWith("https://www.amazon.de/dp/B000000000");
    expect(status).toBe("Copied (no tag found).");
  });

  it("does not copy on a non-Amazon page", async () => {
    const status = await clickCopy("https://example.com/?tag=foo");
    expect(writeText).not.toHaveBeenCalled();
    expect(status).toBe("This is not an Amazon page.");
  });

  it("reports a failed clipboard write", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const status = await clickCopy("https://www.amazon.de/dp/B000000000?tag=foo-21");
    expect(status).toBe("Could not copy the URL.");
  });
});
