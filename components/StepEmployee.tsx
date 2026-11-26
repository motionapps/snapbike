import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { activeEmployees, employeeName, lastStepEmployee, saveStepEmployee } from '../lib/employees';
import type { StepTab } from '../lib/jobSteps';
import { useOrderContext } from '../lib/orderContext';
import { colors } from '../lib/theme';
import { DropdownAnchor, measureAnchor, OptionDropdown } from './OptionDropdown';
import { useStaff } from './StaffProvider';
import { styles } from './StepEmployee.styles';

const LABEL: Record<StepTab, string> = {
  note: 'Mottagen av',
  inspect: 'Besiktigad av',
  jobList: 'Utförd av',
};

/** Asked on Klar when nobody is chosen for the step. */
const QUESTION: Record<StepTab, string> = {
  note: 'Vem tog emot cykeln?',
  inspect: 'Vem gjorde besiktningen?',
  jobList: 'Vem utförde jobbet?',
};

/**
 * Who did the step: the one chosen on the job, else (shown pre-selected)
 * the employee this login is.
 */
function useStepEmployeeId(tab: StepTab): string | null {
  const { stepEmployees } = useOrderContext();
  const { loginEmployeeId } = useStaff();
  return stepEmployees[tab] ?? loginEmployeeId;
}

function useSetStepEmployee(tab: StepTab) {
  const { order, setStepEmployees } = useOrderContext();
  return async (id: string) => {
    setStepEmployees((current) => ({ ...current, [tab]: id }));
    if (order.bookingId) await saveStepEmployee(order.bookingId, tab, id);
  };
}

/**
 * Before Klar: makes sure the step has a mechanic saved on the job. An
 * employee login's own name is saved without asking; otherwise the picker
 * opens with whoever did this step on the last job pre-selected. Resolves
 * false on Avbryt, so Klar stops.
 */
export function useEnsureStepEmployee(tab: StepTab) {
  const { employees, pickEmployee } = useStaff();
  const current = useStepEmployeeId(tab);
  const setStepEmployee = useSetStepEmployee(tab);
  return async (): Promise<boolean> => {
    const choices = activeEmployees(employees);
    // A store without mechanics in BikeOffice can still finish steps.
    if (choices.length === 0) return true;
    let id = current;
    if (!id) {
      const last = await lastStepEmployee(tab).catch(() => null);
      const preselected = choices.some((employee) => employee.id === last) ? last : null;
      id = await pickEmployee(QUESTION[tab], preselected);
      if (!id) return false;
    }
    // Always written: a choice made before the job had its row isn't saved yet.
    await setStepEmployee(id);
    return true;
  };
}

/** "Mottagen av" row at the top of the step; picks from a dropdown right under it. */
export function StepEmployeePicker({ tab }: { tab: StepTab }) {
  const { employees } = useStaff();
  const current = useStepEmployeeId(tab);
  const setStepEmployee = useSetStepEmployee(tab);
  const ref = useRef<View>(null);
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);
  const [error, setError] = useState('');

  const choices = activeEmployees(employees);
  if (choices.length === 0) return null;

  const choose = (id: string) => {
    setAnchor(null);
    setError('');
    setStepEmployee(id).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  };

  const name = employeeName(employees, current);
  return (
    <View>
      <Pressable
        ref={ref}
        onPress={() => measureAnchor(ref, setAnchor)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.label}>{LABEL[tab]}</Text>
        <Text style={[styles.value, !name && styles.placeholder]} numberOfLines={1}>
          {name || 'Välj mekaniker'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>
      <OptionDropdown
        anchor={anchor}
        options={choices.map((employee) => ({ value: employee.id, label: employee.name }))}
        value={current ?? ''}
        onPick={choose}
        onClose={() => setAnchor(null)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
