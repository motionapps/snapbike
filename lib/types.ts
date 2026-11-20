import { BikeData } from './bikeAnalysis';

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

export type Job = {
  id: string;
  title: string;
  category: string;
  price: number;
  products: Product[];
  /** 'kritisk' = trafikfarligt/måste åtgärdas innan cykeln kan användas. */
  severity?: 'kritisk' | 'normal';
  /** Kundens beslut per åtgärd; undefined = ej beslutat än. */
  approval?: 'godkänd' | 'nekad';
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

export function isCustomerValid(customer: Customer): boolean {
  return customer.firstName.trim() !== '' && customer.phone.trim() !== '';
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
  'ready',
  'delivered',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<JobStatus, string> = {
  booked: 'Bokad',
  checked_in: 'Inlämnad',
  inspected: 'Besiktigad',
  ready: 'Klar',
  delivered: 'Utlämnad',
};

export type Estimate = {
  id: string;
  createdAt: string;
  transcript: string;
  jobs: Job[];
  imagePath: string | null;
  total: number;
  status: JobStatus;
  customer: Customer | null;
  bike: BikeData | null;
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function jobTotal(job: Job): number {
  return job.price + job.products.reduce((p, prod) => p + prod.price, 0);
}

export function jobsTotal(jobs: Job[]): number {
  return jobs.reduce((sum, job) => sum + jobTotal(job), 0);
}

/** Summa för de åtgärder kunden inte har nekat (nekade räknas bort). */
export function approvedTotal(jobs: Job[]): number {
  return jobs
    .filter((job) => job.approval !== 'nekad')
    .reduce((sum, job) => sum + jobTotal(job), 0);
}
