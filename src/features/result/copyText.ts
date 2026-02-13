export async function copyTextToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API is not supported in this browser.");
  }

  await navigator.clipboard.writeText(text);
}

