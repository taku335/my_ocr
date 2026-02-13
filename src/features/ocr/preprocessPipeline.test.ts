import {
  preprocessImageForBackgroundColorRemoval,
  preprocessImageForDigitOcr,
} from "./preprocessImage";
import { runPreprocessPipeline } from "./preprocessPipeline";

vi.mock("./preprocessImage", () => ({
  preprocessImageForBackgroundColorRemoval: vi.fn(),
  preprocessImageForDigitOcr: vi.fn(),
}));

const mockPreprocessImageForBackgroundColorRemoval = vi.mocked(
  preprocessImageForBackgroundColorRemoval
);
const mockPreprocessImageForDigitOcr = vi.mocked(preprocessImageForDigitOcr);

describe("runPreprocessPipeline", () => {
  beforeEach(() => {
    mockPreprocessImageForBackgroundColorRemoval.mockReset();
    mockPreprocessImageForDigitOcr.mockReset();
  });

  it("returns original image when no preprocess option is enabled", async () => {
    const source = new File(["dummy"], "source.png", { type: "image/png" });

    const result = await runPreprocessPipeline(source, {
      hasBackgroundColor: false,
      hasTableGridLines: false,
    });

    expect(result.image).toBe(source);
    expect(result.appliedSteps).toEqual([]);
    expect(mockPreprocessImageForBackgroundColorRemoval).not.toHaveBeenCalled();
    expect(mockPreprocessImageForDigitOcr).not.toHaveBeenCalled();
  });

  it("applies enabled preprocess steps and returns converted blob", async () => {
    const source = new File(["dummy"], "source.png", { type: "image/png" });
    const canvasAfterBackground = document.createElement("canvas");
    canvasAfterBackground.width = 2;
    canvasAfterBackground.height = 2;
    const preprocessedBlob = new Blob(["processed"], { type: "image/png" });
    const canvasAfterGrid = document.createElement("canvas");

    vi.spyOn(canvasAfterGrid, "toBlob").mockImplementation((callback) => {
      callback(preprocessedBlob);
    });

    mockPreprocessImageForBackgroundColorRemoval.mockResolvedValue(canvasAfterBackground);
    mockPreprocessImageForDigitOcr.mockResolvedValue(canvasAfterGrid);

    const result = await runPreprocessPipeline(source, {
      hasBackgroundColor: true,
      hasTableGridLines: true,
    });

    expect(mockPreprocessImageForBackgroundColorRemoval).toHaveBeenCalledWith(source);
    expect(mockPreprocessImageForDigitOcr).toHaveBeenCalledWith(canvasAfterBackground);
    expect(result.appliedSteps).toEqual(["remove-background-color", "remove-table-grid-lines"]);
    expect(result.image).toBe(preprocessedBlob);
  });
});
