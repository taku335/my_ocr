const DEFAULT_LONG_RUN_RATIO = 0.45;
const MIN_RUN_LENGTH_PX = 24;
const DARK_PIXEL = 1;

function getPixelIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

function extractLuminance(source: Uint8ClampedArray): Uint8Array {
  const luminance = new Uint8Array(source.length / 4);
  for (let pixel = 0; pixel < luminance.length; pixel += 1) {
    const offset = pixel * 4;
    const red = source[offset];
    const green = source[offset + 1];
    const blue = source[offset + 2];
    luminance[pixel] = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
  }
  return luminance;
}

function otsuThreshold(values: Uint8Array): number {
  const histogram = new Array<number>(256).fill(0);
  for (const value of values) {
    histogram[value] += 1;
  }

  let sum = 0;
  for (let index = 0; index < histogram.length; index += 1) {
    sum += index * histogram[index];
  }

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let maxVariance = -1;
  let threshold = 128;

  for (let index = 0; index < histogram.length; index += 1) {
    backgroundWeight += histogram[index];
    if (backgroundWeight === 0) {
      continue;
    }

    const foregroundWeight = values.length - backgroundWeight;
    if (foregroundWeight === 0) {
      break;
    }

    backgroundSum += index * histogram[index];

    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const betweenClassVariance =
      backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;

    if (betweenClassVariance > maxVariance) {
      maxVariance = betweenClassVariance;
      threshold = index;
    }
  }

  return threshold;
}

function createBinaryMask(luminance: Uint8Array, threshold: number): Uint8Array {
  const binary = new Uint8Array(luminance.length);
  for (let index = 0; index < luminance.length; index += 1) {
    binary[index] = luminance[index] <= threshold ? DARK_PIXEL : 0;
  }
  return binary;
}

function markHorizontalRuns(
  binary: Uint8Array,
  mask: Uint8Array,
  width: number,
  height: number,
  minRunLength: number
): void {
  for (let y = 0; y < height; y += 1) {
    let x = 0;
    while (x < width) {
      if (binary[getPixelIndex(x, y, width)] !== DARK_PIXEL) {
        x += 1;
        continue;
      }

      const runStart = x;
      while (x < width && binary[getPixelIndex(x, y, width)] === DARK_PIXEL) {
        x += 1;
      }

      const runLength = x - runStart;
      if (runLength < minRunLength) {
        continue;
      }

      for (let runX = runStart; runX < x; runX += 1) {
        mask[getPixelIndex(runX, y, width)] = 1;
      }
    }
  }
}

function markVerticalRuns(
  binary: Uint8Array,
  mask: Uint8Array,
  width: number,
  height: number,
  minRunLength: number
): void {
  for (let x = 0; x < width; x += 1) {
    let y = 0;
    while (y < height) {
      if (binary[getPixelIndex(x, y, width)] !== DARK_PIXEL) {
        y += 1;
        continue;
      }

      const runStart = y;
      while (y < height && binary[getPixelIndex(x, y, width)] === DARK_PIXEL) {
        y += 1;
      }

      const runLength = y - runStart;
      if (runLength < minRunLength) {
        continue;
      }

      for (let runY = runStart; runY < y; runY += 1) {
        mask[getPixelIndex(x, runY, width)] = 1;
      }
    }
  }
}

export function detectLongLineMask(
  binary: Uint8Array,
  width: number,
  height: number,
  minHorizontalRunLength: number,
  minVerticalRunLength: number
): Uint8Array {
  if (binary.length !== width * height) {
    throw new Error("binaryマスクのサイズが画像サイズと一致しません。");
  }

  const lineMask = new Uint8Array(binary.length);
  markHorizontalRuns(binary, lineMask, width, height, minHorizontalRunLength);
  markVerticalRuns(binary, lineMask, width, height, minVerticalRunLength);
  return lineMask;
}

function whitenDetectedLines(imageData: ImageData, lineMask: Uint8Array): void {
  const pixels = imageData.data;
  for (let index = 0; index < lineMask.length; index += 1) {
    if (lineMask[index] !== 1) {
      continue;
    }

    const offset = index * 4;
    pixels[offset] = 255;
    pixels[offset + 1] = 255;
    pixels[offset + 2] = 255;
    pixels[offset + 3] = 255;
  }
}

async function loadImageFromBlob(image: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(image);

  try {
    const element = new Image();
    await new Promise<void>((resolve, reject) => {
      element.onload = () => resolve();
      element.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
      element.src = objectUrl;
    });
    return element;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawSourceToCanvas(
  context: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number
): void {
  context.drawImage(source, 0, 0, width, height);
}

function getSourceDimensions(source: HTMLImageElement | HTMLCanvasElement): {
  width: number;
  height: number;
} {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth,
      height: source.naturalHeight,
    };
  }

  return {
    width: source.width,
    height: source.height,
  };
}

export async function preprocessImageForDigitOcr(
  image: Blob | HTMLCanvasElement
): Promise<HTMLCanvasElement> {
  const sourceImage = image instanceof Blob ? await loadImageFromBlob(image) : image;
  const dimensions = getSourceDimensions(sourceImage);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Canvas contextの取得に失敗しました。");
  }

  drawSourceToCanvas(context, sourceImage, dimensions.width, dimensions.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const luminance = extractLuminance(imageData.data);
  const threshold = otsuThreshold(luminance);
  const binary = createBinaryMask(luminance, threshold);

  const minHorizontalRunLength = Math.max(
    MIN_RUN_LENGTH_PX,
    Math.floor(canvas.width * DEFAULT_LONG_RUN_RATIO)
  );
  const minVerticalRunLength = Math.max(
    MIN_RUN_LENGTH_PX,
    Math.floor(canvas.height * DEFAULT_LONG_RUN_RATIO)
  );

  const lineMask = detectLongLineMask(
    binary,
    canvas.width,
    canvas.height,
    minHorizontalRunLength,
    minVerticalRunLength
  );

  whitenDetectedLines(imageData, lineMask);
  context.putImageData(imageData, 0, 0);
  return canvas;
}
