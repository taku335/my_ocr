import {
  preprocessImageForBackgroundColorRemoval,
  preprocessImageForDigitOcr,
} from "./preprocessImage";
import {
  DEFAULT_OCR_PREPROCESS_OPTIONS,
  type OcrPreprocessOptions,
} from "./types";

type PreprocessInput = Blob | HTMLCanvasElement;

type PreprocessStep = {
  id: string;
  isEnabled: (options: OcrPreprocessOptions) => boolean;
  apply: (image: PreprocessInput) => Promise<PreprocessInput>;
};

export type PreprocessResult = {
  image: Blob;
  appliedSteps: string[];
};

function isBlob(image: PreprocessInput): image is Blob {
  return image instanceof Blob;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/png");
  });

  if (!blob) {
    throw new Error("前処理結果の画像変換に失敗しました。");
  }

  return blob;
}

const PREPROCESS_STEPS: PreprocessStep[] = [
  {
    id: "remove-background-color",
    isEnabled: (options) => options.hasBackgroundColor,
    apply: async (image) => preprocessImageForBackgroundColorRemoval(image),
  },
  {
    id: "remove-table-grid-lines",
    isEnabled: (options) => options.hasTableGridLines,
    apply: async (image) => preprocessImageForDigitOcr(image),
  },
];

export async function runPreprocessPipeline(
  image: Blob,
  options: OcrPreprocessOptions = DEFAULT_OCR_PREPROCESS_OPTIONS
): Promise<PreprocessResult> {
  let current: PreprocessInput = image;
  const appliedSteps: string[] = [];

  for (const step of PREPROCESS_STEPS) {
    if (!step.isEnabled(options)) {
      continue;
    }

    current = await step.apply(current);
    appliedSteps.push(step.id);
  }

  const output = isBlob(current) ? current : await canvasToBlob(current);

  return {
    image: output,
    appliedSteps,
  };
}
