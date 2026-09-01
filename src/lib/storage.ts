import { supabase } from './supabase';

export async function uploadOrderFile(
  file: File,
  orderId: string,
  itemId: string
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${orderId}/${itemId}-${safeName}`;
    const { error } = await supabase.storage
      .from('order-files')
      .upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage
      .from('order-files')
      .getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}
