import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export interface PickedImage {
  uri: string;
  base64: string;
}

/** Prompt the user to pick a receipt image. Returns null if they cancel. */
export async function pickReceipt(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo library permission was denied.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.base64) throw new Error("Couldn't read the selected image.");
  return { uri: asset.uri, base64: asset.base64 };
}

/** Upload a receipt to the group's Storage folder; returns its public URL. */
export async function uploadReceipt(groupId: string, base64: string): Promise<string> {
  const path = `${groupId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, decode(base64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl;
}
