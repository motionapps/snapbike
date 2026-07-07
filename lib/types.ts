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
  customerName: string;
  customerPhone: string;
};

export const EMPTY_ORDER: OrderInfo = {
  bikeNumber: '',
  customerName: '',
  customerPhone: '',
};

export type PriceItem = {
  category: string;
  title: string;
  price: number;
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
