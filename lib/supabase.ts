import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { BikeData } from './bikeAnalysis';
import { InspectionState } from './inspection';
import { Customer, Job, Task, JobStatus, tasksTotal, normalizePhone, customerHasName, customerHasPhone } from './types';

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
  imageUri: string | null;
  transcript: string;
  tasks: Task[];
  customer: Customer | null;
  bike: BikeData | null;
  bikeNumber: string;
  inspection: InspectionState;
  /** Existing booking row to update; null inserts a new row. */
  bookingId: string | null;
};

/**
 * Uploads the photo (if any) to the snapbike bucket and stores the job.
 * An imported booking is updated in place and moved to checked_in; otherwise
 * a new row is inserted. Returns the row id.
 */
export async function saveJob({
  imageUri,
  transcript,
  tasks,
  customer,
  bike,
  bikeNumber,
  inspection,
  bookingId,
}: JobInput): Promise<string> {
  if (!customerHasName(customer) && !customerHasPhone(customer)) {
    throw new Error('Kunden saknar både namn och telefonnummer – jobbet kan inte sparas.');
  }

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

  const customerId = customer ? await upsertCustomer(customer) : null;

  const fields = {
    transcript,
    tasks,
    total: tasksTotal(tasks),
    customer_id: customerId,
    bike,
    bike_number: bikeNumber.trim() || null,
    inspection,
    // Keep the booking's existing photo when no new one was taken.
    ...(imagePath ? { image_path: imagePath } : {}),
  };

  const { data, error } = bookingId
    ? await supabase
        .from('snapbike_jobs')
        .update({ ...fields, status: 'checked_in' })
        .eq('id', bookingId)
        .select('id')
        .single()
    : await supabase
        .from('snapbike_jobs')
        .insert(fields)
        .select('id')
        .single();

  if (error) {
    throw new Error(`Kunde inte spara: ${error.message}`);
  }
  return data.id as string;
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
 * Without a phone it is stored with phone NULL, which never conflicts, so a new row is created.
 */
async function upsertCustomer(customer: Customer): Promise<string> {
  const { data, error } = await supabase
    .from('snapbike_customer')
    .upsert(
      {
        first_name: customer.firstName.trim(),
        last_name: customer.lastName.trim(),
        phone: normalizePhone(customer.phone) || null,
        email: customer.email.trim(),
      },
      { onConflict: 'phone' }
    )
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

/** Auto-save of the Besiktning checklist onto an already saved row. */
export async function updateJobInspection(
  id: string,
  inspection: InspectionState
): Promise<void> {
  const { error } = await supabase
    .from('snapbike_jobs')
    .update({ inspection })
    .eq('id', id);
  if (error) {
    throw new Error(`Kunde inte spara besiktningen: ${error.message}`);
  }
}

/** Public URL for a photo in the snapbike bucket. */
export function jobImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  return supabase.storage.from('snapbike').getPublicUrl(imagePath).data
    .publicUrl;
}
