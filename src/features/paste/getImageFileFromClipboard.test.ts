import { getImageFileFromClipboard } from "./getImageFileFromClipboard";

describe("getImageFileFromClipboard", () => {
  it("returns image file for supported MIME types", () => {
    const file = new File(["img"], "capture.png", { type: "image/png" });
    const data = {
      items: [
        {
          type: "image/png",
          getAsFile: () => file,
        },
      ],
    } as unknown as DataTransfer;

    expect(getImageFileFromClipboard(data)).toBe(file);
  });

  it("returns null for unsupported data", () => {
    const data = {
      items: [
        {
          type: "text/plain",
          getAsFile: () => null,
        },
      ],
    } as unknown as DataTransfer;

    expect(getImageFileFromClipboard(data)).toBeNull();
  });
});

