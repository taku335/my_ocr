import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { recognizeImage } from "./features/ocr/recognizeImage";
import { getImageFileFromClipboard } from "./features/paste/getImageFileFromClipboard";
import { copyTextToClipboard } from "./features/result/copyText";

const PASTE_ERROR_MESSAGE =
  "画像を貼り付けてください。対応形式: PNG / JPEG / WEBP";

function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "資料をコピーして、この画面で Ctrl+V / Cmd+V してください。"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  const handleClipboardData = useCallback((data: DataTransfer | null) => {
    const pastedImage = getImageFileFromClipboard(data);
    if (!pastedImage) {
      setErrorMessage(PASTE_ERROR_MESSAGE);
      return;
    }

    setImageFile(pastedImage);
    setRecognizedText("");
    setProgress(0);
    setErrorMessage(null);
    setStatusMessage("画像を受け付けました。「OCR実行」を押してください。");
  }, []);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      handleClipboardData(event.clipboardData);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleClipboardData]);

  const handleRunOcr = useCallback(async () => {
    if (!imageFile) {
      setErrorMessage("先に画像を貼り付けてください。");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage("OCR処理中です...");

    try {
      const text = await recognizeImage(imageFile, setProgress);
      setRecognizedText(text);
      setStatusMessage("OCRが完了しました。必要ならテキストを修正してください。");
    } catch {
      setErrorMessage("OCRに失敗しました。画像を確認して再実行してください。");
      setStatusMessage("OCR処理に失敗しました。");
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile]);

  const handleClear = useCallback(() => {
    setImageFile(null);
    setRecognizedText("");
    setProgress(0);
    setErrorMessage(null);
    setIsProcessing(false);
    setStatusMessage("クリアしました。新しい画像を貼り付けてください。");
  }, []);

  const handleCopy = useCallback(async () => {
    if (!recognizedText.trim()) {
      setErrorMessage("コピー対象のテキストがありません。");
      return;
    }

    try {
      await copyTextToClipboard(recognizedText);
      setErrorMessage(null);
      setStatusMessage("OCR結果をコピーしました。");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "コピーに失敗しました。テキストを手動で選択してコピーしてください。";
      setErrorMessage(message);
    }
  }, [recognizedText]);

  const canRunOcr = Boolean(imageFile) && !isProcessing;
  const canCopy = Boolean(recognizedText.trim()) && !isProcessing;
  const hasImage = useMemo(() => Boolean(imagePreviewUrl), [imagePreviewUrl]);

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Local OCR for Reuse</p>
        <h1>my_ocr</h1>
        <p>
          クリップボード画像から文字を抽出し、編集して再利用できます。データはブラウザ内で処理されます。
        </p>
      </header>

      <section className="panel">
        <h2>1. 画像を貼り付け</h2>
        <div
          className="paste-area"
          tabIndex={0}
          onPaste={(event) => {
            event.preventDefault();
            handleClipboardData(event.clipboardData);
          }}
          aria-label="貼り付けエリア"
        >
          このエリアをクリックしてから Ctrl+V / Cmd+V で画像を貼り付け
        </div>

        {hasImage && imagePreviewUrl && (
          <figure className="preview">
            <img src={imagePreviewUrl} alt="貼り付けた画像のプレビュー" />
            <figcaption>プレビュー</figcaption>
          </figure>
        )}

        <div className="actions">
          <button
            type="button"
            onClick={() => {
              void handleRunOcr();
            }}
            disabled={!canRunOcr}
          >
            OCR実行
          </button>
          <button type="button" onClick={handleClear} disabled={isProcessing}>
            クリア
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCopy();
            }}
            disabled={!canCopy}
          >
            コピー
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>2. OCR結果</h2>
        <textarea
          aria-label="OCR結果テキスト"
          className="result-text"
          value={recognizedText}
          onChange={(event) => setRecognizedText(event.target.value)}
          placeholder="OCR結果がここに表示されます"
          spellCheck={false}
        />
      </section>

      <section className="panel status-panel" aria-live="polite">
        <h2>ステータス</h2>
        <p className={errorMessage ? "status error" : "status"} role="status">
          {errorMessage ?? statusMessage}
        </p>
        {isProcessing && (
          <div className="progress-row">
            <progress max={100} value={progress} aria-label="OCR進捗" />
            <span>{progress}%</span>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
