import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';

export type UploadedOrderFile = {
  path: string;
  url: string;
};

export async function uploadOrderFile(
  file: File,
  orderId: string,
  itemId: string
): Promise<UploadedOrderFile> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('File storage is not configured.');
  }

  const safeOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeItemId = itemId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `orders/${safeOrderId}/${safeItemId}-${safeName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || undefined,
  });

  const url = await getDownloadURL(storageRef);

  return { path, url };
}

export function getOrderFileUrl(filePathOrUrl: string): string | null {
  if (!filePathOrUrl) return null;
  if (/^https?:\/\//i.test(filePathOrUrl)) return filePathOrUrl;
  if (!storage) return null;
  // Firebase Storage URLs are constructed from the path via getDownloadURL,
  // but for stored paths we return the path as-is for admin display
  return filePathOrUrl;
}
