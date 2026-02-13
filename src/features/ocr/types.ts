export type OcrCharacterModes = {
  japanese: boolean;
  english: boolean;
  digits: boolean;
};

export const DEFAULT_OCR_MODES: OcrCharacterModes = {
  japanese: true,
  english: true,
  digits: true,
};

export type OcrPreprocessOptions = {
  hasBackgroundColor: boolean;
  hasTableGridLines: boolean;
};

export const DEFAULT_OCR_PREPROCESS_OPTIONS: OcrPreprocessOptions = {
  hasBackgroundColor: false,
  hasTableGridLines: true,
};
