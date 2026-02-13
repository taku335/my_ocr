const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export function getImageFileFromClipboard(data: DataTransfer | null): File | null {
  if (!data?.items?.length) {
    return null;
  }

  for (const item of Array.from(data.items)) {
    if (!SUPPORTED_IMAGE_TYPES.has(item.type)) {
      continue;
    }

    const file = item.getAsFile();
    if (file) {
      return file;
    }
  }

  return null;
}

