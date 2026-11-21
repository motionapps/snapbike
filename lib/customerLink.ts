import type { BikeData } from './bikeAnalysis';
import type { InspectionState } from './inspection';
import { supabase } from './supabase';
import type { JobStatus, Task } from './types';

/** Base URL of the hosted web build, e.g. https://kund.example.se */
const CUSTOMER_URL = (process.env.EXPO_PUBLIC_CUSTOMER_URL ?? '').replace(/\/$/, '');

export const WORKSHOP_NAME = process.env.EXPO_PUBLIC_WORKSHOP_NAME ?? 'Verkstaden';
export const WORKSHOP_PHONE = process.env.EXPO_PUBLIC_WORKSHOP_PHONE ?? '';

/** How long after the first answer the customer may still change it. */
const CHANGE_WINDOW_MS = 2 * 60 * 60 * 1000;

export function customerLink(shareToken: string): string {
  return `${CUSTOMER_URL}/k/${shareToken}`;
}

export function shareMessage(firstName: string, shareToken: string): string {
  const greeting = firstName.trim() ? `Hej ${firstName.trim()}!` : 'Hej!';
  return (
    `${greeting} Vi har gått igenom din cykel. Här ser du vad som behöver ` +
    `göras och kan godkänna åtgärderna: ${customerLink(shareToken)}`
  );
}

/** The share token when the current web URL is a customer link (/k/<token>). */
export function tokenFromLocation(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  const match = window.location.pathname.match(/^\/k\/([0-9a-f-]{36})\/?$/i);
  return match ? match[1] : null;
}

export type CustomerJob = {
  status: JobStatus;
  tasks: Task[];
  inspection: InspectionState;
  bike: BikeData | null;
  bikeNumber: string | null;
  imagePath: string | null;
  firstName: string | null;
  respondedAt: string | null;
};

export async function fetchCustomerJob(token: string): Promise<CustomerJob | null> {
  const { data, error } = await supabase.rpc('snapbike_customer_job', { token });
  if (error) throw new Error(error.message);
  return (data as CustomerJob | null) ?? null;
}

export async function sendCustomerResponse(
  token: string,
  approvals: Record<string, 'godkänd' | 'nekad'>
): Promise<void> {
  const { error } = await supabase.rpc('snapbike_customer_respond', { token, approvals });
  if (error) {
    throw new Error(
      error.message.includes('locked')
        ? 'Svaret kan inte längre ändras. Kontakta verkstaden.'
        : 'Kunde inte skicka svaret. Försök igen.'
    );
  }
}

/** When the answer stops being changeable, or null if it is changeable without time limit (no answer yet). */
export function changeDeadline(respondedAt: string | null): Date | null {
  return respondedAt ? new Date(new Date(respondedAt).getTime() + CHANGE_WINDOW_MS) : null;
}

/** Same rule as snapbike_customer_respond: open while inspected/approved and inside the 2 h window. */
export function canRespond(job: CustomerJob, now = new Date()): boolean {
  if (job.status !== 'inspected' && job.status !== 'customer_approved') return false;
  const deadline = changeDeadline(job.respondedAt);
  return !deadline || now < deadline;
}
