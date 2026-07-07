import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Estimate, Job, JobStatus, jobsTotal } from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Uploads the photo (if any) to the snapbike bucket and stores the estimate
 * row. Returns the new row id.
 */
export async function saveEstimate(
  imageUri: string | null,
  transcript: string,
  jobs: Job[]
): Promise<string> {
  let imagePath: string | null = null;

  if (imageUri) {
    // The legacy FileSystem API is native-only; on web the picker returns a
    // blob:/data: URL that plain fetch can read.
    let body: Blob | ArrayBuffer;
    if (Platform.OS === 'web') {
      body = await (await fetch(imageUri)).blob();
    } else {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      body = decode(base64);
    }
    imagePath = `photos/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('snapbike')
      .upload(imagePath, body, { contentType: 'image/jpeg' });
    if (uploadError) {
      throw new Error(`Bilduppladdning misslyckades: ${uploadError.message}`);
    }
  }

  const { data, error } = await supabase
    .from('snapbike_estimates')
    .insert({
      transcript,
      jobs,
      image_path: imagePath,
      total: jobsTotal(jobs),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Kunde inte spara: ${error.message}`);
  }
  return data.id as string;
}

type EstimateRow = {
  id: string;
  created_at: string;
  transcript: string;
  jobs: Job[];
  image_path: string | null;
  total: number;
  status: JobStatus;
};

/** Fetches all saved estimates, newest first. */
export async function fetchEstimates(): Promise<Estimate[]> {
  const { data, error } = await supabase
    .from('snapbike_estimates')
    .select('id, created_at, transcript, jobs, image_path, total, status')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Kunde inte hämta jobb: ${error.message}`);
  }

  return (data as EstimateRow[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    transcript: row.transcript,
    jobs: row.jobs ?? [],
    imagePath: row.image_path,
    total: Number(row.total),
    status: row.status,
  }));
}

/**
 * Changes an estimate's status via the snapbike_set_status RPC (the anon key
 * has no general UPDATE access on the table).
 */
export async function setEstimateStatus(
  id: string,
  status: JobStatus
): Promise<void> {
  const { error } = await supabase.rpc('snapbike_set_status', {
    estimate_id: id,
    new_status: status,
  });
  if (error) {
    throw new Error(`Kunde inte ändra status: ${error.message}`);
  }
}

/**
 * Replaces an estimate's job list (and recomputed total) via the
 * snapbike_update_jobs RPC, since the anon key cannot UPDATE the table.
 */
export async function updateEstimateJobs(id: string, jobs: Job[]): Promise<void> {
  const { error } = await supabase.rpc('snapbike_update_jobs', {
    estimate_id: id,
    new_jobs: jobs,
    new_total: jobsTotal(jobs),
  });
  if (error) {
    throw new Error(`Kunde inte spara priser: ${error.message}`);
  }
}

/** Public URL for a photo in the snapbike bucket. */
export function estimateImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  return supabase.storage.from('snapbike').getPublicUrl(imagePath).data
    .publicUrl;
}
