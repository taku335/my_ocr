import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { recognizeImage } from "./features/ocr/recognizeImage";

vi.mock("./features/ocr/recognizeImage", () => ({
  recognizeImage: vi.fn(),
}));

const mockRecognizeImage = vi.mocked(recognizeImage);
const writeTextMock = vi.fn<(text: string) => Promise<void>>();

function dispatchPaste(items: Array<{ type: string; getAsFile: () => File | null }>) {
  fireEvent.paste(window, { clipboardData: { items } });
}

describe("App", () => {
  beforeEach(() => {
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

  it("disables OCR button when no image is pasted", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "OCR実行" })).toBeDisabled();
  });

  it("runs OCR after image paste", async () => {
    mockRecognizeImage.mockResolvedValue("抽出されたテキスト");
    render(<App />);

    const file = new File(["dummy"], "capture.png", { type: "image/png" });
    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() => {
      expect(mockRecognizeImage).toHaveBeenCalledTimes(1);
    });
    expect(mockRecognizeImage).toHaveBeenCalledWith(
      file,
      expect.any(Function),
      {
        japanese: true,
        english: true,
        digits: true,
      },
      {
        hasTableGridLines: true,
      }
    );
    expect(screen.getByDisplayValue("抽出されたテキスト")).toBeInTheDocument();
  });

  it("passes selected reading modes to OCR", async () => {
    mockRecognizeImage.mockResolvedValue("123");
    render(<App />);

    const file = new File(["dummy"], "capture.png", { type: "image/png" });
    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: "英語" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "数字" }));
    fireEvent.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() => {
      expect(mockRecognizeImage).toHaveBeenCalledWith(
        file,
        expect.any(Function),
        {
          japanese: true,
          english: false,
          digits: false,
        },
        {
          hasTableGridLines: true,
        }
      );
    });
  });

  it("passes table-grid option to OCR", async () => {
    mockRecognizeImage.mockResolvedValue("grid off");
    render(<App />);

    const file = new File(["dummy"], "capture.png", { type: "image/png" });
    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: "表罫線を含む" }));
    fireEvent.click(screen.getByRole("button", { name: "OCR実行" }));

    await waitFor(() => {
      expect(mockRecognizeImage).toHaveBeenCalledWith(
        file,
        expect.any(Function),
        {
          japanese: true,
          english: true,
          digits: true,
        },
        {
          hasTableGridLines: false,
        }
      );
    });
  });

  it("disables OCR button when all reading modes are OFF", () => {
    render(<App />);

    const file = new File(["dummy"], "capture.png", { type: "image/png" });
    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);
    expect(screen.getByRole("button", { name: "OCR実行" })).toBeEnabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "日本語" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "英語" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "数字" }));

    expect(screen.getByRole("button", { name: "OCR実行" })).toBeDisabled();
    expect(screen.getByText("少なくとも1つの読み取りモードをONにしてください。")).toBeInTheDocument();
  });

  it("copies recognized text", async () => {
    mockRecognizeImage.mockResolvedValue("copy target");
    render(<App />);

    const file = new File(["dummy"], "capture.png", { type: "image/png" });
    dispatchPaste([
      {
        type: "image/png",
        getAsFile: () => file,
      },
    ]);
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
