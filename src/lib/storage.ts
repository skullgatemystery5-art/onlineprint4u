import {
  ref,
  uploadBytes,
  getDownloadURL,
  type FirebaseStorage,
} from 'firebase/storage';
import { storage } from './firebase';

export async function uploadOrderFile(
  file: File,
  orderId: string,
  itemId: string
): Promise<string | null> {
  if (!storage) return null;
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `order-files/${orderId}/${itemId}-${safeName}`;
    const fileRef = ref(storage as FirebaseStorage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch {
    return null;
  }
}
