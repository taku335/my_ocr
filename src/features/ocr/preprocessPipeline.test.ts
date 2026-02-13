import { preprocessImageForDigitOcr } from "./preprocessImage";
import { runPreprocessPipeline } from "./preprocessPipeline";

vi.mock("./preprocessImage", () => ({
  preprocessImageForDigitOcr: vi.fn(),
}));

const mockPreprocessImageForDigitOcr = vi.mocked(preprocessImageForDigitOcr);

describe("runPreprocessPipeline", () => {
  beforeEach(() => {
    mockPreprocessImageForDigitOcr.mockReset();
  });

  it("returns original image when no preprocess option is enabled", async () => {
    const source = new File(["dummy"], "source.png", { type: "image/png" });

    const result = await runPreprocessPipeline(source, { hasTableGridLines: false });

    expect(result.image).toBe(source);
    expect(result.appliedSteps).toEqual([]);
    expect(mockPreprocessImageForDigitOcr).not.toHaveBeenCalled();
  });

  it("applies enabled preprocess steps and returns converted blob", async () => {
    const source = new File(["dummy"], "source.png", { type: "image/png" });
    const preprocessedBlob = new Blob(["processed"], { type: "image/png" });
    const canvas = document.createElement("canvas");

    vi.spyOn(canvas, "toBlob").mockImplementation((callback) => {
      callback(preprocessedBlob);
    });

    mockPreprocessImageForDigitOcr.mockResolvedValue(canvas);

    const result = await runPreprocessPipeline(source, { hasTableGridLines: true });

    expect(mockPreprocessImageForDigitOcr).toHaveBeenCalledWith(source);
    expect(result.appliedSteps).toEqual(["remove-table-grid-lines"]);
    expect(result.image).toBe(preprocessedBlob);
  });
});
