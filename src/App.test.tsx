import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { runPreprocessPipeline } from "./features/ocr/preprocessPipeline";
import { recognizeImage } from "./features/ocr/recognizeImage";

vi.mock("./features/ocr/preprocessPipeline", () => ({
  runPreprocessPipeline: vi.fn(),
}));

vi.mock("./features/ocr/recognizeImage", () => ({
  recognizeImage: vi.fn(),
}));

const mockRunPreprocessPipeline = vi.mocked(runPreprocessPipeline);
const mockRecognizeImage = vi.mocked(recognizeImage);
const writeTextMock = vi.fn<(text: string) => Promise<void>>();

function dispatchPaste(items: Array<{ type: string; getAsFile: () => File | null }>) {
  fireEvent.paste(window, { clipboardData: { items } });
}

describe("App", () => {
  beforeEach(() => {
    mockRunPreprocessPipeline.mockReset();
    mockRecognizeImage.mockReset();
    writeTextMock.mockReset();
    writeTextMock.mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });
  });

  it("disables preprocess-related and OCR buttons when no image is pasted", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "前処理実行" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "前処理なし" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "OCR実行" })).toBeDisabled();
  });

  it("runs preprocess and then OCR using preprocessed image", async () => {
    const file = new File(["dummy"], "capture.png", { type: "image/png" });
    const preprocessedFile = new File(["processed"], "processed.png", {
      type: "image/png",
    });

    mockRunPreprocessPipeline.mockResolvedValue({
      image: preprocessedFile,
      appliedSteps: ["remove-table-grid-lines"],
    });
    mockRecognizeImage.mockResolvedValue("抽出されたテキスト");

    render(<App />);

    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "前処理実行" }));

    await waitFor(() => {
      expect(mockRunPreprocessPipeline).toHaveBeenCalledWith(file, {
        hasBackgroundColor: false,
        hasTableGridLines: true,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() => {
      expect(mockRecognizeImage).toHaveBeenCalledWith(
        preprocessedFile,
        expect.any(Function),
        {
          japanese: true,
          english: true,
          digits: true,
        }
      );
    });

    expect(screen.getByDisplayValue("抽出されたテキスト")).toBeInTheDocument();
  });

  it("passes selected reading modes to OCR", async () => {
    const file = new File(["dummy"], "capture.png", { type: "image/png" });

    mockRunPreprocessPipeline.mockResolvedValue({
      image: file,
      appliedSteps: ["remove-table-grid-lines"],
    });
    mockRecognizeImage.mockResolvedValue("123");

    render(<App />);

    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "前処理実行" }));

    await waitFor(() => {
      expect(mockRunPreprocessPipeline).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "英語" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "数字" }));
    fireEvent.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() => {
      expect(mockRecognizeImage).toHaveBeenCalledWith(file, expect.any(Function), {
        japanese: true,
        english: false,
        digits: false,
      });
    });
  });

  it("passes table-grid option to preprocess", async () => {
    const file = new File(["dummy"], "capture.png", { type: "image/png" });

    mockRunPreprocessPipeline.mockResolvedValue({
      image: file,
      appliedSteps: [],
    });

    render(<App />);

    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: "表罫線を含む" }));
    fireEvent.click(screen.getByRole("button", { name: "前処理実行" }));

    await waitFor(() => {
      expect(mockRunPreprocessPipeline).toHaveBeenCalledWith(file, {
        hasBackgroundColor: false,
        hasTableGridLines: false,
      });
    });
  });

  it("passes background-removal option to preprocess", async () => {
    const file = new File(["dummy"], "capture.png", { type: "image/png" });

    mockRunPreprocessPipeline.mockResolvedValue({
      image: file,
      appliedSteps: [],
    });

    render(<App />);

    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: "画像の背景色を除去" }));
    fireEvent.click(screen.getByRole("button", { name: "前処理実行" }));

    await waitFor(() => {
      expect(mockRunPreprocessPipeline).toHaveBeenCalledWith(file, {
        hasBackgroundColor: true,
        hasTableGridLines: true,
      });
    });
  });

  it("disables OCR button until preprocess is completed", async () => {
    const file = new File(["dummy"], "capture.png", { type: "image/png" });

    mockRunPreprocessPipeline.mockResolvedValue({
      image: file,
      appliedSteps: [],
    });

    render(<App />);

    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    expect(screen.getByRole("button", { name: "OCR実行" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "前処理実行" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "OCR実行" })).toBeEnabled();
    });
  });

  it("uses original image when preprocess is skipped", async () => {
    const file = new File(["dummy"], "capture.png", { type: "image/png" });
    mockRecognizeImage.mockResolvedValue("skip preprocess");

    render(<App />);

    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "前処理なし" }));
    fireEvent.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() => {
      expect(mockRunPreprocessPipeline).not.toHaveBeenCalled();
      expect(mockRecognizeImage).toHaveBeenCalledWith(file, expect.any(Function), {
        japanese: true,
        english: true,
        digits: true,
      });
    });
  });

  it("disables OCR button when all reading modes are OFF", async () => {
    const file = new File(["dummy"], "capture.png", { type: "image/png" });

    mockRunPreprocessPipeline.mockResolvedValue({
      image: file,
      appliedSteps: [],
    });

    render(<App />);

    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "前処理実行" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "OCR実行" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "日本語" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "英語" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "数字" }));

    expect(screen.getByRole("button", { name: "OCR実行" })).toBeDisabled();
    expect(screen.getByText("少なくとも1つの読み取りモードをONにしてください。")).toBeInTheDocument();
  });

  it("copies recognized text", async () => {
    const file = new File(["dummy"], "capture.png", { type: "image/png" });

    mockRunPreprocessPipeline.mockResolvedValue({
      image: file,
      appliedSteps: [],
    });
    mockRecognizeImage.mockResolvedValue("copy target");

    render(<App />);

    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "前処理実行" }));

    await waitFor(() => {
      expect(mockRunPreprocessPipeline).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("copy target")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "コピー" }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("copy target");
    });
  });

  it("shows error when pasted data is not an image", async () => {
    render(<App />);

    dispatchPaste([
      {
        type: "text/plain",
        getAsFile: () => null,
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText(/画像を貼り付けてください/)).toBeInTheDocument();
    });
  });
});
