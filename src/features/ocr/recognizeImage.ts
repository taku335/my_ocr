import { recognize, type LoggerMessage } from "tesseract.js";

type ProgressCallback = (progress: number) => void;

export async function recognizeImage(
  image: Blob,
  onProgress?: ProgressCallback
): Promise<string> {
  const { data } = await recognize(image, "jpn+eng", {
    logger: (message: LoggerMessage) => {
      if (message.status !== "recognizing text" || !onProgress) {
        return;
      }

      onProgress(Math.round(message.progress * 100));
    },
  });

  return data.text.trim();
}

