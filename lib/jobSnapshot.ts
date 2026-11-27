import { BikeData } from './bikeAnalysis';
import type { InspectionState } from './inspection';
import type { Customer, Job, JobComments, Task } from './types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** The parts of the current job that are saved to Supabase. */
export type JobSnapshot = {
  photoUri: string | null;
  transcript: string;
  tasks: Task[];
  inspectionTasks: Task[];
  customer: Customer | null;
  bikeNumber: string;
  bike: BikeData | null;
  inspection: InspectionState;
  inspectionTranscript: string;
  comments: JobComments;
};

/** What is already stored in Supabase for the current job. */
export type RemoteJob = {
  jobId: string | null;
  imagePath: string | null;
  /** Local photo that imagePath was uploaded from. */
  uploadedPhotoUri: string | null;
  /** undefined = unknown, leave the row's customer as it is. */
  customerId: string | null | undefined;
  /** JSON of the customer as last saved. */
  customerKey: string;
};

export function emptyRemote(): RemoteJob {
  return {
    jobId: null,
    imagePath: null,
    uploadedPhotoUri: null,
    customerId: null,
    customerKey: 'null',
  };
}

export function jobSignature(s: JobSnapshot): string {
  return JSON.stringify(s);
}

export function snapshotIsEmpty(s: JobSnapshot): boolean {
  return (
    !s.photoUri &&
    !s.bike &&
    !s.transcript &&
    s.tasks.length === 0 &&
    s.inspectionTasks.length === 0 &&
    !s.customer &&
    !s.bikeNumber.trim() &&
    Object.keys(s.inspection).length === 0 &&
    !s.inspectionTranscript &&
    !s.comments.customerComment &&
    !s.comments.mechanicComment
  );
}

/**
 * job null = start an empty job. focusBikeDetails opens and scrolls to Mer information;
 * editCustomer opens the customer modal.
 */
export type LoadRequest = {
  job: Job | null;
  nonce: number;
  focusBikeDetails?: boolean;
  editCustomer?: boolean;
};
