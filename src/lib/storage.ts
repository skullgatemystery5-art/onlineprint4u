import { supabase, isSupabaseConfigured } from './supabase';

export type UploadedOrderFile = {
  path: string;
  url: string;
};

const bucketName = 'order-files';

export async function uploadOrderFile(
  file: File,
  orderId: string,
  itemId: string
): Promise<UploadedOrderFile> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('File storage is not configured.');
  }

  const safeOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeItemId = itemId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `orders/${safeOrderId}/${safeItemId}-${safeName}`;
  const { error } = await supabase.storage.from(bucketName).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(`Unable to upload ${file.name}.`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error(`Unable to create a download link for ${file.name}.`);
  }

  return { path, url: data.publicUrl };
}

export function getOrderFileUrl(filePathOrUrl: string): string | null {
  if (!filePathOrUrl) return null;
  if (/^https?:\/\//i.test(filePathOrUrl)) return filePathOrUrl;
  if (!supabase) return null;
  return supabase.storage.from(bucketName).getPublicUrl(filePathOrUrl).data.publicUrl;
}
