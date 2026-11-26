import { BikeData } from './bikeAnalysis';
import type { StepEmployees } from './employees';
import type { InspectionState } from './inspection';

export type Product = {
  id: string;
  name: string;
  price: number;
  /** Artikelnummer i lagerlistan, om produkten matchats mot lagret. */
  articleNumber?: string;
  /** Vid matchningen: över 0 = i lager, 0 = beställningsvara. */
  stock?: number;
  /** Typ av förslag: samma modell/märke, likvärdigt alternativ eller billigare. */
  label?: 'samma' | 'likvärdig' | 'billigare';
  /** How many of the product the job needs; undefined = 1. */
  quantity?: number;
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
  /** Ticked off on the work checklist (Jobblista after sending). */
  done?: boolean;
  /** Mechanic's comment from the work checklist. */
  note?: string;
  /** The price model part the task works on (assets/price-model/parts.csv); picks its image. */
  partId?: string;
  /** Which wheel/brake a sided row is for; unset on a sided row = not chosen yet. */
  side?: Side;
};

/** fram, bak or fram+bak (position=… in conditions.csv). */
export type Side = 'front' | 'rear' | 'both';

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

/** A product that always goes with a price row (assets/price-model/standard_products.csv). */
export type StandardProduct = {
  name: string;
  quantity: number;
  /** Fixed unit price; without it the stock price is used. */
  price?: number;
  /** Added to the job automatically (Standardslang); otherwise only when needed (Eker). */
  auto: boolean;
};

/** One bookable row from the price model: a part's action, a service package or an add-on. */
export type PriceItem = {
  kind: 'job' | 'package' | 'add_on';
  /** Card label: the part's top-level group (Hjul, Broms, …), "Service" or "Tillägg". */
  category: string;
  /** Generated name, e.g. "Byt bromsbelägg (skivbroms)"; unique across the price model. */
  title: string;
  price: number;
  /** Only for kind 'job'. */
  partId?: string;
  actionId?: string;
  /** e.g. { gears: 'hub', brake_type: 'disc' }; empty = always applies. */
  conditions: Record<string, string>;
  /** Free extra text from prices.csv's label column, e.g. "inkl. demontering". */
  label?: string;
  /** Whether the job gets product suggestions at all. */
  hasProduct: boolean;
  /** When set, only these products are suggested; the auto ones are added automatically. */
  standardProducts: StandardProduct[];
  /** Set on rows with sides (fram/bak): the fram+bak price. */
  bothPrice?: number;
};

/** Workshop lifecycle, mirrors the snapbike_job_status enum on Supabase. */
export const JOB_STATUSES = [
  'booked',
  'checked_in',
  'received',
  'inspected',
  'awaiting_customer',
  'customer_approved',
  'in_progress',
  'ready',
  'delivered',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<JobStatus, string> = {
  booked: 'Bokad',
  checked_in: 'Drop-in',
  received: 'Mottagen',
  inspected: 'Besiktigad',
  awaiting_customer: 'Väntar på kund',
  customer_approved: 'Godkänd av kund',
  in_progress: 'Under arbete',
  ready: 'Klar',
  delivered: 'Utlämnad',
};

export type Job = {
  id: string;
  createdAt: string;
  /** Spoken text from Mottagning. */
  transcript: string;
  /** Spoken text from Besiktning. */
  inspectionTranscript: string;
  /** Kundkommentar, edited in the job modal. */
  customerComment: string;
  /** Verkstadskommentar, edited in the job modal. */
  mechanicComment: string;
  /** Tasks agreed at Mottagning. */
  tasks: Task[];
  /** Jobblista: tasks from the Besiktning remarks, sent to the customer. */
  inspectionTasks: Task[];
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
  /** When the Jobblista was last sent to the customer; null if never. */
  sentToCustomerAt: string | null;
  /** When the customer first answered via the link; null if not yet. */
  customerRespondedAt: string | null;
  /** Who did Mottagning, Besiktning and the work (employee ids). */
  stepEmployees: StepEmployees;
};

/** Send state of the Jobblista, as stored on the job row. */
export type JobListSendState = {
  shareToken: string;
  /** The Jobblista as last sent; this is what the customer page shows. */
  sentTasks: Task[] | null;
  sentAt: string | null;
  verbalApprovalAt: string | null;
};

/** Kundkommentar and Verkstadskommentar of a job. */
export type JobComments = { customerComment: string; mechanicComment: string };

export const EMPTY_COMMENTS: JobComments = { customerComment: '', mechanicComment: '' };

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function taskTotal(task: Task): number {
  return task.price + task.products.reduce((p, prod) => p + productTotal(prod), 0);
}

/** Unit price × quantity. */
export function productTotal(product: Product): number {
  return product.price * (product.quantity ?? 1);
}

export function tasksTotal(tasks: Task[]): number {
  return tasks.reduce((sum, task) => sum + taskTotal(task), 0);
}

/** Total of a job: Mottagning tasks plus the Jobblista tasks the customer has not denied. */
export function jobTotal(tasks: Task[], inspectionTasks: Task[]): number {
  return tasksTotal(tasks) + approvedTotal(inspectionTasks);
}

/**
 * Splits the Jobblista for display. With both answered and unanswered tasks it
 * is "Tidigare godkänt" + "Tilläggsorder"; otherwise one list of all tasks.
 */
export function splitJobList(
  tasks: Task[]
): { kind: 'single'; tasks: Task[] } | { kind: 'addOn'; previous: Task[]; addOn: Task[] } {
  const previous = tasks.filter((task) => task.approval);
  const addOn = tasks.filter((task) => !task.approval);
  if (previous.length === 0 || addOn.length === 0) return { kind: 'single', tasks };
  return { kind: 'addOn', previous, addOn };
}

/** Summa för de åtgärder kunden inte har nekat (nekade räknas bort). */
export function approvedTotal(tasks: Task[]): number {
  return tasks
    .filter((task) => task.approval !== 'nekad')
    .reduce((sum, task) => sum + taskTotal(task), 0);
}
