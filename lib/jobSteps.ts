import { JOB_STATUSES, JobStatus } from './types';

/** Tabs that are finished with Klar; each one moves the job's status on. */
export type StepTab = 'note' | 'inspect' | 'jobList';

/** Status Klar sets, and the status Lås upp goes back to. */
export const STEP_STATUS: Record<StepTab, { done: JobStatus; undo: JobStatus }> = {
  note: { done: 'received', undo: 'checked_in' },
  inspect: { done: 'inspected', undo: 'received' },
  jobList: { done: 'awaiting_customer', undo: 'inspected' },
};

/** A step is done (and locked) once the job's status has reached its Klar status. */
export function stepDone(tab: StepTab, status: JobStatus | null): boolean {
  if (!status) return false;
  return JOB_STATUSES.indexOf(status) >= JOB_STATUSES.indexOf(STEP_STATUS[tab].done);
}
