import {
  PSM,
  recognize,
  type LoggerMessage,
  type WorkerOptions,
  type WorkerParams,
} from "tesseract.js";

type ProgressCallback = (progress: number) => void;

export type OcrCharacterModes = {
  japanese: boolean;
  english: boolean;
  digits: boolean;
};

const DEFAULT_MODES: OcrCharacterModes = {
  japanese: true,
  english: true,
  digits: true,
};

const DIGIT_ONLY_WHITELIST = "0123456789.,:/-+%()[]{} ";

function resolveLanguage(modes: OcrCharacterModes): string {
  const langs: string[] = [];

  if (modes.japanese) {
    langs.push("jpn");
  }

  if (modes.english || modes.digits) {
    langs.push("eng");
  }

  return Array.from(new Set(langs)).join("+");
}

function createWorkerParams(modes: OcrCharacterModes): Partial<WorkerParams> {
  if (!modes.japanese && !modes.english && modes.digits) {
    return {
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: DIGIT_ONLY_WHITELIST,
    };
  }

  return {};
}

function filterByModes(text: string, modes: OcrCharacterModes): string {
  let result = text;

  if (!modes.digits) {
    result = result.replace(/[0-9]/g, "");
  }

  if (!modes.english) {
    result = result.replace(/[A-Za-z]/g, "");
  }

  if (!modes.japanese) {
    result = result.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9f]/g, "");
  }

  return result.trim();
}

export async function recognizeImage(
  image: Blob,
  onProgress?: ProgressCallback,
  modes: OcrCharacterModes = DEFAULT_MODES
): Promise<string> {
  const language = resolveLanguage(modes);

  if (!language) {
    throw new Error("少なくとも1つの読み取りモードをONにしてください。");
  }

  const workerParams = createWorkerParams(modes);
  const workerOptions: Partial<WorkerOptions> = {
    logger: (message: LoggerMessage) => {
      if (message.status !== "recognizing text" || !onProgress) {
        return;
      }

      onProgress(Math.round(message.progress * 100));
    },
    ...(workerParams as Partial<WorkerOptions>),
  };

  const { data } = await recognize(image, language, workerOptions);
  return filterByModes(data.text, modes);
}
