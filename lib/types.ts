import { BikeData } from './bikeAnalysis';
import type { InspectionState } from './inspection';

export type Product = {
  id: string;
  name: string;
  price: number;
  /** Artikelnummer i lagerlistan, om produkten matchats mot lagret. */
  articleNumber?: string;
  /** Lagersaldo vid matchningen; 0 = beställningsvara. */
  stock?: number;
  /** Typ av förslag: samma modell/märke, likvärdigt alternativ eller billigare. */
  label?: 'samma' | 'likvärdig' | 'billigare';
};

export type Task = {
  id: string;
  title: string;
  category: string;
  price: number;
  products: Product[];
  /** 'kritisk' = trafikfarligt/måste åtgärdas innan cykeln kan användas. */
  severity?: 'kritisk' | 'normal';
  /** Kundens beslut per åtgärd; undefined = ej beslutat än. */
  approval?: 'godkänd' | 'nekad';
  /** Inspection checklist item ids this task fixes; places it on the customer's bike silhouette. */
  inspectionItemIds?: string[];
};

/**
 * Arbetsordermetadata runt cykeln. Lokalt i appen tills vidare – redo att
 * kopplas mot Supabase (kundregister, ledigt cykelnummer, godkännande).
 */
export type OrderInfo = {
  /** Verkstadens cykelnummer 1–100. "Ledigt" avgörs av backend senare. */
  bikeNumber: string;
  customer: Customer | null;
  /** Id of the imported booking; Spara then updates that row instead of inserting. */
  bookingId: string | null;
};

/** First name and phone are required; last name and email may be empty. */
export type Customer = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export const EMPTY_CUSTOMER: Customer = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
};

/** Phone numbers are stored and matched without spaces or dashes. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}

export function customerHasName(customer: Customer | null): boolean {
  return !!customer && (customer.firstName.trim() !== '' || customer.lastName.trim() !== '');
}

export function customerHasPhone(customer: Customer | null): boolean {
  return !!customer && normalizePhone(customer.phone) !== '';
}

/** Swedish warning for a customer missing name and/or phone, or null if both are set. */
export function customerWarning(customer: Customer | null): string | null {
  const hasName = customerHasName(customer);
  const hasPhone = customerHasPhone(customer);
  if (hasName && hasPhone) return null;
  if (!hasName && !hasPhone) return 'Kunden saknar namn och telefonnummer';
  return hasName ? 'Kunden saknar telefonnummer' : 'Kunden saknar namn';
}

export const EMPTY_ORDER: OrderInfo = {
  bikeNumber: '',
  customer: null,
  bookingId: null,
};

/** What the photo shows: a whole bike, a loose part, a trolley/pram, or anything else. */
export const ITEM_KINDS = ['bike', 'part', 'trolley', 'other'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export type PriceItem = {
  category: string;
  title: string;
  price: number;
  /** The price list's bikeType column: all_bikes, electric, racer, cargo, hub, external, part, trolley, other. */
  bikeType: string;
};

/** Workshop lifecycle, mirrors the snapbike_job_status enum on Supabase. */
export const JOB_STATUSES = [
  'booked',
  'checked_in',
  'inspected',
  'customer_approved',
  'in_progress',
  'ready',
  'delivered',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<JobStatus, string> = {
  booked: 'Bokad',
  checked_in: 'Inlämnad',
  inspected: 'Besiktigad',
  customer_approved: 'Godkänd av kund',
  in_progress: 'Under arbete',
  ready: 'Klar',
  delivered: 'Utlämnad',
};

export type Job = {
  id: string;
  createdAt: string;
  transcript: string;
  tasks: Task[];
  imagePath: string | null;
  total: number;
  status: JobStatus;
  customer: Customer | null;
  bike: BikeData | null;
  /** Workshop tag number; empty when none was given. */
  bikeNumber: string;
  /** Saved Besiktning checklist for this bike. */
  inspection: InspectionState;
  /** Secret token in the customer link. */
  shareToken: string;
  /** When the customer first answered via the link; null if not yet. */
  customerRespondedAt: string | null;
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function taskTotal(task: Task): number {
  return task.price + task.products.reduce((p, prod) => p + prod.price, 0);
}

export function tasksTotal(tasks: Task[]): number {
  return tasks.reduce((sum, task) => sum + taskTotal(task), 0);
}

/** Summa för de åtgärder kunden inte har nekat (nekade räknas bort). */
export function approvedTotal(tasks: Task[]): number {
  return tasks
    .filter((task) => task.approval !== 'nekad')
    .reduce((sum, task) => sum + taskTotal(task), 0);
}
