import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { BikeData } from './bikeAnalysis';
import { InspectionState } from './inspection';
import { Customer, Job, Task, JobStatus, tasksTotal, normalizePhone } from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Same setup as barcode-scanner: the session is kept on the device and the
// access token is renewed silently, so staff sign in once.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Whether the signed-in user is on the snapbike_staff allowlist. */
export async function isStaff(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('snapbike_staff')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Kunde inte kontrollera behörighet: ${error.message}`);
  }
  return data !== null;
}

export type JobInput = {
  /** Row to update; null inserts a new row. */
  jobId: string | null;
  /** Uploaded photo; null keeps the row's current photo. */
  imagePath: string | null;
  transcript: string;
  tasks: Task[];
  /** Customer row; undefined leaves the row's customer untouched. */
  customerId: string | null | undefined;
  bike: BikeData | null;
  bikeNumber: string;
  inspection: InspectionState;
};

/** Uploads a photo to the snapbike bucket and returns its storage path. */
export async function uploadJobImage(imageUri: string): Promise<string> {
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
  const imagePath = `photos/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('snapbike')
    .upload(imagePath, body, { contentType: 'image/jpeg' });
  if (error) {
    throw new Error(`Bilduppladdning misslyckades: ${error.message}`);
  }
  return imagePath;
}

/**
 * Auto-save of the current job. A new job is inserted as checked_in (the
 * bike is in the shop); an existing row is updated, and a booking moves from
 * booked to checked_in. Returns the row id.
 */
export async function saveJob({
  jobId,
  imagePath,
  transcript,
  tasks,
  customerId,
  bike,
  bikeNumber,
  inspection,
}: JobInput): Promise<string> {
  const fields = {
    transcript,
    tasks,
    total: tasksTotal(tasks),
    bike,
    bike_number: bikeNumber.trim() || null,
    inspection,
    ...(customerId !== undefined ? { customer_id: customerId } : {}),
    ...(imagePath ? { image_path: imagePath } : {}),
  };

  if (!jobId) {
    const { data, error } = await supabase
      .from('snapbike_jobs')
      .insert({ ...fields, status: 'checked_in' })
      .select('id')
      .single();
    if (error) throw new Error(`Kunde inte spara: ${error.message}`);
    return data.id as string;
  }

  const { error } = await supabase.from('snapbike_jobs').update(fields).eq('id', jobId);
  if (error) throw new Error(`Kunde inte spara: ${error.message}`);
  const { error: statusError } = await supabase
    .from('snapbike_jobs')
    .update({ status: 'checked_in' })
    .eq('id', jobId)
    .eq('status', 'booked');
  if (statusError) throw new Error(`Kunde inte spara: ${statusError.message}`);
  return jobId;
}

type CustomerRow = {
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
};

function toCustomer(row: CustomerRow): Customer {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? '',
    email: row.email,
  };
}

/**
 * Creates the customer, or updates the one with the same phone. Returns its id.
 * Without a phone, the job's existing customer row (existingId) is updated so
 * repeated auto-saves don't create duplicates; with no such row a new one is created.
 */
export async function saveCustomer(
  customer: Customer,
  existingId: string | null | undefined
): Promise<string> {
  const row = {
    first_name: customer.firstName.trim(),
    last_name: customer.lastName.trim(),
    phone: normalizePhone(customer.phone) || null,
    email: customer.email.trim(),
  };
  const { data, error } =
    !row.phone && existingId
      ? await supabase
          .from('snapbike_customer')
          .update(row)
          .eq('id', existingId)
          .select('id')
          .single()
      : await supabase
          .from('snapbike_customer')
          .upsert(row, { onConflict: 'phone' })
          .select('id')
          .single();
  if (error) {
    throw new Error(`Kunde inte spara kunden: ${error.message}`);
  }
  return data.id as string;
}

/** Customers whose name or phone contains the text, for autofill. */
export async function searchCustomers(text: string): Promise<Customer[]> {
  // Characters that would break the PostgREST or() filter.
  const term = text.trim().replace(/[,()*%\\]/g, '');
  if (term.length < 2) return [];
  const pattern = `%${term}%`;
  const phonePattern = `%${normalizePhone(term)}%`;
  const { data, error } = await supabase
    .from('snapbike_customer')
    .select('first_name, last_name, phone, email')
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${phonePattern}`)
    .order('first_name')
    .limit(6);
  if (error) {
    throw new Error(`Kunde inte söka kunder: ${error.message}`);
  }
  return (data as CustomerRow[]).map(toCustomer);
}

type JobRow = {
  id: string;
  created_at: string;
  transcript: string;
  tasks: Task[];
  image_path: string | null;
  total: number;
  status: JobStatus;
  customer: CustomerRow | null;
  bike: BikeData | null;
  bike_number: string | null;
  inspection: InspectionState | null;
  share_token: string;
  customer_responded_at: string | null;
};

/** Fetches saved jobs, newest first, optionally only one status. */
export async function fetchJobs(status?: JobStatus): Promise<Job[]> {
  let query = supabase
    .from('snapbike_jobs')
    .select('id, created_at, transcript, tasks, image_path, total, status, customer:snapbike_customer(first_name, last_name, phone, email), bike, bike_number, inspection, share_token, customer_responded_at')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;

  if (error) {
    throw new Error(`Kunde inte hämta jobb: ${error.message}`);
  }

  return (data as unknown as JobRow[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    transcript: row.transcript,
    tasks: row.tasks ?? [],
    imagePath: row.image_path,
    total: Number(row.total),
    status: row.status,
    customer: row.customer ? toCustomer(row.customer) : null,
    bike: row.bike,
    bikeNumber: row.bike_number ?? '',
    inspection: row.inspection ?? {},
    shareToken: row.share_token,
    customerRespondedAt: row.customer_responded_at,
  }));
}

/**
 * Changes a job's status via the snapbike_set_status RPC (the anon key
 * has no general UPDATE access on the table).
 */
export async function setJobStatus(
  id: string,
  status: JobStatus
): Promise<void> {
  const { error } = await supabase.rpc('snapbike_set_status', {
    job_id: id,
    new_status: status,
  });
  if (error) {
    throw new Error(`Kunde inte ändra status: ${error.message}`);
  }
}

/**
 * Replaces a job's task list (and recomputed total) via the
 * snapbike_update_tasks RPC, since the anon key cannot UPDATE the table.
 */
export async function updateJobTasks(id: string, tasks: Task[]): Promise<void> {
  const { error } = await supabase.rpc('snapbike_update_tasks', {
    job_id: id,
    new_tasks: tasks,
    new_total: tasksTotal(tasks),
  });
  if (error) {
    throw new Error(`Kunde inte spara priser: ${error.message}`);
  }
}

/** Permanently deletes a job row. */
export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('snapbike_jobs').delete().eq('id', id);
  if (error) {
    throw new Error(`Kunde inte ta bort jobbet: ${error.message}`);
  }
}

/** Public URL for a photo in the snapbike bucket. */
export function jobImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  return supabase.storage.from('snapbike').getPublicUrl(imagePath).data
    .publicUrl;
}
