import { Ionicons } from '@expo/vector-icons';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { activeEmployees, Employee, fetchStaff } from '../lib/employees';
import { colors } from '../lib/theme';
import { styles } from './StaffProvider.styles';

type StaffContextValue = {
  /** The store's employees, removed ones included (they still name old jobs). */
  employees: Employee[];
  /** The employee this login is, for an employee login; null for the store's admin. */
  loginEmployeeId: string | null;
  /** Opens the mechanic picker; resolves with the chosen id, or null on Avbryt. */
  pickEmployee: (title: string, preselected: string | null) => Promise<string | null>;
};

const StaffContext = createContext<StaffContextValue | null>(null);

export function useStaff(): StaffContextValue {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('StaffContext saknas');
  return ctx;
}

type Request = { title: string; resolve: (id: string | null) => void };

/** Loads the store's mechanics and hosts the picker modal. */
export function StaffProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loginEmployeeId, setLoginEmployeeId] = useState<string | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const requestRef = useRef<Request | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStaff(userId)
      .then((staff) => {
        if (cancelled) return;
        setEmployees(staff.employees);
        setLoginEmployeeId(staff.loginEmployeeId);
      })
      .catch((err) => console.warn(err instanceof Error ? err.message : err));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const close = (id: string | null) => {
    requestRef.current?.resolve(id);
    requestRef.current = null;
    setRequest(null);
  };

  const pickEmployee = useCallback(
    (title: string, preselected: string | null) =>
      new Promise<string | null>((resolve) => {
        // A second picker replaces the first, which counts as Avbryt.
        requestRef.current?.resolve(null);
        const next = { title, resolve };
        requestRef.current = next;
        setSelected(preselected);
        setRequest(next);
      }),
    []
  );

  const choices = activeEmployees(employees);

  return (
    <StaffContext.Provider value={{ employees, loginEmployeeId, pickEmployee }}>
      {children}
      <Modal visible={request !== null} transparent animationType="fade" onRequestClose={() => close(null)}>
        <Pressable style={styles.backdrop} onPress={() => close(null)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{request?.title}</Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {choices.map((employee) => {
                const isSelected = employee.id === selected;
                return (
                  <Pressable
                    key={employee.id}
                    onPress={() => setSelected(employee.id)}
                    style={({ pressed }) => [styles.row, isSelected && styles.rowSelected, pressed && styles.rowPressed]}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? colors.accentLight : colors.textFaint}
                    />
                    <Text style={styles.rowText}>{employee.name}</Text>
                  </Pressable>
                );
              })}
              {choices.length === 0 ? (
                <Text style={styles.empty}>Inga mekaniker. Lägg till dem under Butik i BikeOffice.</Text>
              ) : null}
            </ScrollView>
            <View style={styles.buttons}>
              <Pressable onPress={() => close(null)} style={styles.cancel} hitSlop={8}>
                <Text style={styles.cancelText}>Avbryt</Text>
              </Pressable>
              <Pressable
                onPress={() => selected && close(selected)}
                disabled={!selected}
                style={({ pressed }) => [styles.ok, !selected && styles.okDisabled, pressed && styles.okPressed]}
              >
                <Text style={styles.okText}>OK</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </StaffContext.Provider>
  );
}
