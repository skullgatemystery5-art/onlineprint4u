export type UploadedOrderFile = {
  path: string;
  url: string;
};

const MAX_BASE64_BYTES = 4_500_000;

export async function uploadOrderFile(
  file: File,
  _orderId: string,
  _itemId: string
): Promise<UploadedOrderFile> {
  if (file.size > MAX_BASE64_BYTES) {
    throw new Error(`${file.name} is too large to store inline (max ${Math.round(MAX_BASE64_BYTES / 1_000_000)}MB).`);
  }

  const dataUrl = await fileToBase64(file);
  return { path: file.name, url: dataUrl };
}

export function getOrderFileUrl(filePathOrUrl: string): string | null {
  if (!filePathOrUrl) return null;
  return filePathOrUrl;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error(`Unable to read ${file.name}.`));
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}
