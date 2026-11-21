import AsyncStorage from '@react-native-async-storage/async-storage';
import { BikeData } from './bikeAnalysis';
import type { InspectionState } from './inspection';
import { ItemKind, JobComments, JobStatus, Task, OrderInfo } from './types';

/**
 * Local auto-save of the current order (AsyncStorage: device storage on
 * native, localStorage on web). Written on every change so nothing is lost
 * in a crash, even before the debounced Supabase save has gone out.
 */

const KEY = 'snapbike_draft_v2';

export type Draft = {
  photoUri: string | null;
  /** What the photo shows; missing in drafts saved before it existed. */
  itemKind?: ItemKind | null;
  /** Photo analysis; missing in drafts saved before it existed. */
  bike?: BikeData | null;
  transcript: string;
  /** Besiktning transcript; missing in drafts saved before it existed. */
  inspectionTranscript?: string;
  /** Kundkommentar and Verkstadskommentar; missing in drafts saved before they existed. */
  comments?: JobComments;
  tasks: Task[];
  /** Jobblista; missing in drafts saved before it existed. */
  inspectionTasks?: Task[];
  order: OrderInfo;
  /** Besiktning checklist; missing in drafts saved before it existed. */
  inspection?: InspectionState;
  /** Storage path of the uploaded photo, and which local photo it is. */
  imagePath?: string | null;
  uploadedPhotoUri?: string | null;
  /** Saved customer row; undefined = unknown (keep the row's current one). */
  customerId?: string | null;
  /** JSON of the customer as last saved, to skip unchanged re-saves. */
  customerKey?: string;
  /** Status of the saved job; missing in drafts saved before it existed. */
  jobStatus?: JobStatus | null;
  savedAt: number;
};

export function saveDraft(draft: Omit<Draft, 'savedAt'>): void {
  AsyncStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() })).catch(
    () => {
      // Full disk / private mode: better silent than a crash.
    }
  );
}

export async function loadDraft(): Promise<Draft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    // An empty draft is not worth restoring.
    if (
      !draft.transcript &&
      (!draft.tasks || draft.tasks.length === 0) &&
      (!draft.inspectionTasks || draft.inspectionTasks.length === 0) &&
      !draft.photoUri &&
      !draft.order?.customer &&
      !draft.order?.bikeNumber &&
      Object.keys(draft.inspection ?? {}).length === 0
    ) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  AsyncStorage.removeItem(KEY).catch(() => {});
}
