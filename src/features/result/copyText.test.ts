import { copyTextToClipboard } from "./copyText";

describe("copyTextToClipboard", () => {
  it("calls navigator.clipboard.writeText", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await copyTextToClipboard("hello");
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("throws when Clipboard API is not supported", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    await expect(copyTextToClipboard("hello")).rejects.toThrow(
      "Clipboard API is not supported in this browser."
    );
  });
});

