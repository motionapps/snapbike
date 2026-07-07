import { Job, OrderInfo } from './types';

/**
 * Lokal autospar av den pågående ordern. Tills Supabase-sparandet är
 * inkopplat (kräver riktig anon-nyckel + kolumner) ligger allt man pratar
 * in kvar på enheten och överlever omladdning/krasch. På webben används
 * localStorage; på native (utan localStorage) blir det en tyst no-op tills
 * Johannes kopplar in riktig lagring.
 */

const KEY = 'snapbike_draft_v1';

export type Draft = {
  photoUri: string | null;
  transcript: string;
  jobs: Job[];
  order: OrderInfo;
  savedAt: number;
};

function store(): Storage | null {
  try {
    const s = (globalThis as { localStorage?: Storage }).localStorage;
    // Verifiera att det faktiskt går att skriva (privat läge kan kasta).
    if (!s) return null;
    return s;
  } catch {
    return null;
  }
}

export const draftPersistAvailable = store() !== null;

export function saveDraft(draft: Omit<Draft, 'savedAt'>): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Full disk / privat läge – ignorera, hellre tyst än krasch.
  }
}

export function loadDraft(): Draft | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    // Tomt utkast är inte värt att återställa.
    if (!draft.transcript && (!draft.jobs || draft.jobs.length === 0) && !draft.photoUri) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    // ignorera
  }
}
