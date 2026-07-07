export type Product = {
  id: string;
  name: string;
  price: number;
};

export type Job = {
  id: string;
  title: string;
  category: string;
  price: number;
  products: Product[];
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

export function jobsTotal(jobs: Job[]): number {
  return jobs.reduce(
    (sum, job) =>
      sum + job.price + job.products.reduce((p, prod) => p + prod.price, 0),
    0
  );
}
