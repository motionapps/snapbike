import type { StepTab } from './jobSteps';
import { supabase } from './supabase';

/** One person in BikeOffice's user_settings.employees. Rows point to it by id. */
export type Employee = {
  id: string;
  name: string;
  /** Removed in BikeOffice: kept so old jobs still show the name, but not pickable. */
  removed?: boolean;
};

/** Who did each step of a job; null = nobody chosen yet. */
export type StepEmployees = Record<StepTab, string | null>;

export const EMPTY_STEP_EMPLOYEES: StepEmployees = { note: null, inspect: null, jobList: null };

/** snapbike_jobs column per step. */
export const STEP_EMPLOYEE_COLUMN = {
  note: 'received_by',
  inspect: 'inspected_by',
  jobList: 'worked_by',
} as const satisfies Record<StepTab, string>;

export function activeEmployees(employees: Employee[]): Employee[] {
  return employees.filter((employee) => !employee.removed);
}

export function employeeName(employees: Employee[], id: string | null): string {
  return (id && employees.find((employee) => employee.id === id)?.name) || '';
}

/**
 * The store's employees and, for an employee login, which one it is.
 * RLS gives each login its own store's user_settings row.
 */
export async function fetchStaff(
  userId: string
): Promise<{ employees: Employee[]; loginEmployeeId: string | null }> {
  const [settings, membership] = await Promise.all([
    supabase.from('user_settings').select('employees').maybeSingle(),
    supabase.from('account_members').select('employee_id').eq('member_user_id', userId).maybeSingle(),
  ]);
  if (settings.error) throw new Error(`Kunde inte hämta mekaniker: ${settings.error.message}`);
  if (membership.error) throw new Error(`Kunde inte hämta mekaniker: ${membership.error.message}`);
  return {
    employees: (settings.data?.employees as Employee[] | null) ?? [],
    loginEmployeeId: (membership.data?.employee_id as string | undefined) ?? null,
  };
}

/** Who did this step on the store's latest job where someone was set. */
export async function lastStepEmployee(step: StepTab): Promise<string | null> {
  const column = STEP_EMPLOYEE_COLUMN[step];
  const { data, error } = await supabase
    .from('snapbike_jobs')
    .select(column)
    .not(column, 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Kunde inte hämta mekaniker: ${error.message}`);
  return ((data as Record<string, string> | null)?.[column]) ?? null;
}

export async function saveStepEmployee(jobId: string, step: StepTab, employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('snapbike_jobs')
    .update({ [STEP_EMPLOYEE_COLUMN[step]]: employeeId })
    .eq('id', jobId);
  if (error) throw new Error(`Kunde inte spara mekaniker: ${error.message}`);
}

/** Who did each step of one job. */
export async function fetchStepEmployees(jobId: string): Promise<StepEmployees> {
  const { data, error } = await supabase
    .from('snapbike_jobs')
    .select('received_by, inspected_by, worked_by')
    .eq('id', jobId)
    .maybeSingle();
  if (error) throw new Error(`Kunde inte hämta mekaniker: ${error.message}`);
  return {
    note: data?.received_by ?? null,
    inspect: data?.inspected_by ?? null,
    jobList: data?.worked_by ?? null,
  };
}
