import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { runPreprocessPipeline } from "./features/ocr/preprocessPipeline";
import { recognizeImage } from "./features/ocr/recognizeImage";
import {
  DEFAULT_OCR_MODES,
  DEFAULT_OCR_PREPROCESS_OPTIONS,
  type OcrCharacterModes,
  type OcrPreprocessOptions,
} from "./features/ocr/types";
import { getImageFileFromClipboard } from "./features/paste/getImageFileFromClipboard";
import { copyTextToClipboard } from "./features/result/copyText";

const PASTE_ERROR_MESSAGE =
  "画像を貼り付けてください。対応形式: PNG / JPEG / WEBP";
const MODE_REQUIRED_MESSAGE = "少なくとも1つの読み取りモードをONにしてください。";

function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [preprocessedImage, setPreprocessedImage] = useState<Blob | null>(null);
  const [preprocessedPreviewUrl, setPreprocessedPreviewUrl] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "資料をコピーして、この画面で Ctrl+V / Cmd+V してください。"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [ocrModes, setOcrModes] = useState<OcrCharacterModes>(DEFAULT_OCR_MODES);
  const [preprocessOptions, setPreprocessOptions] = useState<OcrPreprocessOptions>(
    DEFAULT_OCR_PREPROCESS_OPTIONS
  );

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

  useEffect(() => {
    if (!preprocessedImage) {
      setPreprocessedPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(preprocessedImage);
    setPreprocessedPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [preprocessedImage]);

  const handleClipboardData = useCallback((data: DataTransfer | null) => {
    const pastedImage = getImageFileFromClipboard(data);
    if (!pastedImage) {
      setErrorMessage(PASTE_ERROR_MESSAGE);
      return;
    }

    setImageFile(pastedImage);
    setPreprocessedImage(null);
    setRecognizedText("");
    setProgress(0);
    setErrorMessage(null);
    setStatusMessage("画像を受け付けました。「前処理実行」を押してください。");
  }, []);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      handleClipboardData(event.clipboardData);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleClipboardData]);

  const isBusy = useMemo(() => isPreprocessing || isRecognizing, [isPreprocessing, isRecognizing]);

  const handleRunPreprocess = useCallback(async () => {
    if (!imageFile) {
      setErrorMessage("先に画像を貼り付けてください。");
      return;
    }

    setErrorMessage(null);
    setIsPreprocessing(true);
    setProgress(0);
    setRecognizedText("");
    setStatusMessage("前処理を実行中です...");

    try {
      const result = await runPreprocessPipeline(imageFile, preprocessOptions);
      setPreprocessedImage(result.image);

      if (result.appliedSteps.length > 0) {
        setStatusMessage("前処理が完了しました。文字種を選んでOCRを実行してください。");
      } else {
        setStatusMessage(
          "前処理オプションがOFFのため元画像をそのまま使用します。文字種を選んでOCRを実行してください。"
        );
      }
    } catch {
      setErrorMessage("前処理に失敗しました。画像や設定を確認して再実行してください。");
      setStatusMessage("前処理に失敗しました。");
    } finally {
      setIsPreprocessing(false);
    }
  }, [imageFile, preprocessOptions]);

  const handleRunOcr = useCallback(async () => {
    if (!imageFile) {
      setErrorMessage("先に画像を貼り付けてください。");
      return;
    }

    if (!preprocessedImage) {
      setErrorMessage("先に「前処理実行」を押してください。");
      return;
    }

    if (!Object.values(ocrModes).some(Boolean)) {
      setErrorMessage(MODE_REQUIRED_MESSAGE);
      return;
    }

    setErrorMessage(null);
    setIsRecognizing(true);
    setProgress(0);
    setStatusMessage("OCR処理中です...");

    try {
      const text = await recognizeImage(preprocessedImage, setProgress, ocrModes);
      setRecognizedText(text);
      setStatusMessage("OCRが完了しました。必要ならテキストを修正してください。");
    } catch {
      setErrorMessage("OCRに失敗しました。画像を確認して再実行してください。");
      setStatusMessage("OCR処理に失敗しました。");
    } finally {
      setIsRecognizing(false);
    }
  }, [imageFile, ocrModes, preprocessedImage]);

  const handleToggleMode = useCallback(
    (key: keyof OcrCharacterModes) => {
      if (isBusy) {
        return;
      }

      setOcrModes((previous) => ({ ...previous, [key]: !previous[key] }));
      setErrorMessage(null);
    },
    [isBusy]
  );

  const handleToggleTableGridLines = useCallback(() => {
    if (isBusy) {
      return;
    }

    setPreprocessOptions((previous) => ({
      ...previous,
      hasTableGridLines: !previous.hasTableGridLines,
    }));
    setPreprocessedImage(null);
    setRecognizedText("");
    setProgress(0);
    setErrorMessage(null);
    setStatusMessage("前処理設定を変更しました。「前処理実行」を押してください。");
  }, [isBusy]);

  const handleClear = useCallback(() => {
    setImageFile(null);
    setPreprocessedImage(null);
    setRecognizedText("");
    setProgress(0);
    setErrorMessage(null);
    setIsPreprocessing(false);
    setIsRecognizing(false);
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

  const hasEnabledMode = useMemo(() => Object.values(ocrModes).some(Boolean), [ocrModes]);
  const canRunPreprocess = Boolean(imageFile) && !isBusy;
  const canRunOcr = Boolean(preprocessedImage) && hasEnabledMode && !isBusy;
  const canCopy = Boolean(recognizedText.trim()) && !isBusy;
  const hasImage = useMemo(() => Boolean(imagePreviewUrl), [imagePreviewUrl]);
  const hasPreprocessedImage = useMemo(
    () => Boolean(preprocessedPreviewUrl),
    [preprocessedPreviewUrl]
  );

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
            <figcaption>元画像プレビュー</figcaption>
          </figure>
        )}

        <fieldset className="mode-group" disabled={isBusy}>
          <legend>2. 前処理オプション</legend>
          <label className="mode-option">
            <input
              type="checkbox"
              checked={preprocessOptions.hasTableGridLines}
              onChange={handleToggleTableGridLines}
            />
            表罫線を含む
          </label>
          <p className="mode-hint">
            ONの場合、表の水平線・垂直線を弱めます。今後ここに前処理オプションを追加できます。
          </p>
        </fieldset>

        <div className="actions">
          <button
            type="button"
            onClick={() => {
              void handleRunPreprocess();
            }}
            disabled={!canRunPreprocess}
          >
            前処理実行
          </button>
        </div>

        {hasPreprocessedImage && preprocessedPreviewUrl && (
          <figure className="preview preview-processed">
            <img src={preprocessedPreviewUrl} alt="前処理後の画像プレビュー" />
            <figcaption>前処理後画像プレビュー</figcaption>
          </figure>
        )}

        <fieldset className="mode-group" disabled={isBusy}>
          <legend>3. 読み取りモード</legend>
          <label className="mode-option">
            <input
              type="checkbox"
              checked={ocrModes.japanese}
              onChange={() => handleToggleMode("japanese")}
            />
            日本語
          </label>
          <label className="mode-option">
            <input
              type="checkbox"
              checked={ocrModes.english}
              onChange={() => handleToggleMode("english")}
            />
            英語
          </label>
          <label className="mode-option">
            <input
              type="checkbox"
              checked={ocrModes.digits}
              onChange={() => handleToggleMode("digits")}
            />
            数字
          </label>
          {!hasEnabledMode && <p className="mode-hint mode-hint-error">{MODE_REQUIRED_MESSAGE}</p>}
          {hasEnabledMode && (
            <p className="mode-hint">
              前処理後画像に含まれる文字種だけをONにすると、誤認識を減らしやすくなります。
            </p>
          )}
        </fieldset>

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
          <button type="button" onClick={handleClear} disabled={isBusy}>
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
        <h2>4. OCR結果</h2>
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
        {isRecognizing && (
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
