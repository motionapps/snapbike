import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  INSPECTION_ITEM_COUNT,
  INSPECTION_TEMPLATE,
  InspectionState,
  InspectionStatus,
  inspectionIssues,
  inspectionSummaryText,
} from '../lib/besiktning';
import { colors, radius, shadow } from '../lib/theme';

const SUMMARY_STEP = INSPECTION_TEMPLATE.length;

export function BesiktningScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<InspectionState>({});

  const setStatus = useCallback((itemId: string, status: InspectionStatus) => {
    setResults((current) => {
      const existing = current[itemId];
      if (existing?.status === status) {
        // Tap on the active status clears the item again.
        const next = { ...current };
        delete next[itemId];
        return next;
      }
      return {
        ...current,
        [itemId]: { status, note: existing?.note ?? '' },
      };
    });
  }, []);

  const setNote = useCallback((itemId: string, note: string) => {
    setResults((current) => {
      const existing = current[itemId];
      if (!existing) return current;
      return { ...current, [itemId]: { ...existing, note } };
    });
  }, []);

  const markSectionOk = useCallback((sectionIndex: number) => {
    setResults((current) => {
      const next = { ...current };
      for (const item of INSPECTION_TEMPLATE[sectionIndex].items) {
        if (!next[item.id]) {
          next[item.id] = { status: 'ok', note: '' };
        }
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setResults({});
    setStep(0);
  }, []);

  const checkedCount = useMemo(
    () => Object.keys(results).length,
    [results]
  );

  const section = step < SUMMARY_STEP ? INSPECTION_TEMPLATE[step] : null;
  const issues = useMemo(() => inspectionIssues(results), [results]);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.titleRow,
          { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 },
        ]}
      >
        <Text style={styles.title}>Besiktning</Text>
        <Text style={styles.subtitle}>
          {checkedCount}/{INSPECTION_ITEM_COUNT} punkter
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(checkedCount / INSPECTION_ITEM_COUNT) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.stepRow}>
        {INSPECTION_TEMPLATE.map((s, index) => (
          <Pressable
            key={s.key}
            onPress={() => setStep(index)}
            style={[styles.stepDot, index === step && styles.stepDotActive]}
          >
            <Ionicons
              name={s.icon as never}
              size={16}
              color={index === step ? colors.onAccent : colors.textFaint}
            />
          </Pressable>
        ))}
        <Pressable
          onPress={() => setStep(SUMMARY_STEP)}
          style={[styles.stepDot, step === SUMMARY_STEP && styles.stepDotActive]}
        >
          <Ionicons
            name="flag-outline"
            size={16}
            color={step === SUMMARY_STEP ? colors.onAccent : colors.textFaint}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {section ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionStep}>
                Steg {step + 1} av {SUMMARY_STEP}
              </Text>
            </View>

            {section.items.map((item) => {
              const result = results[item.id];
              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemHint}>{item.hint}</Text>
                    </View>
                    <View style={styles.statusRow}>
                      <StatusButton
                        icon="checkmark"
                        active={result?.status === 'ok'}
                        activeColor={colors.accent}
                        onPress={() => setStatus(item.id, 'ok')}
                      />
                      <StatusButton
                        icon="warning"
                        active={result?.status === 'issue'}
                        activeColor={colors.danger}
                        onPress={() => setStatus(item.id, 'issue')}
                      />
                      <StatusButton
                        icon="remove"
                        active={result?.status === 'skip'}
                        activeColor={colors.textSecondary}
                        onPress={() => setStatus(item.id, 'skip')}
                      />
                    </View>
                  </View>
                  {result?.status === 'issue' ? (
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Anteckning (t.ex. kedja 0,75 % sliten)"
                      placeholderTextColor={colors.textFaint}
                      value={result.note}
                      onChangeText={(text) => setNote(item.id, text)}
                      multiline
                    />
                  ) : null}
                </View>
              );
            })}

            <Pressable onPress={() => markSectionOk(step)} style={styles.allOk}>
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color={colors.accent}
              />
              <Text style={styles.allOkText}>Resten av sektionen OK</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sammanfattning</Text>
              <Text style={styles.sectionStep}>
                {checkedCount}/{INSPECTION_ITEM_COUNT} kontrollerade
              </Text>
            </View>

            {issues.length === 0 ? (
              <View style={styles.noIssues}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={32}
                  color={colors.accent}
                />
                <Text style={styles.noIssuesText}>Inga anmärkningar</Text>
              </View>
            ) : (
              issues.map((issue, index) => (
                <View key={index} style={styles.issueCard}>
                  <Ionicons name="warning" size={16} color={colors.danger} />
                  <View style={styles.issueText}>
                    <Text style={styles.issueTitle}>
                      {issue.title}
                      <Text style={styles.issueSection}> · {issue.section}</Text>
                    </Text>
                    {issue.note ? (
                      <Text style={styles.issueNote}>{issue.note}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>SOM TEXT</Text>
              <Text selectable style={styles.summaryText}>
                {inspectionSummaryText(results)}
              </Text>
            </View>

            <Pressable onPress={reset} style={styles.resetButton}>
              <Ionicons name="refresh-outline" size={18} color={colors.text} />
              <Text style={styles.resetText}>Ny besiktning</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={[styles.navRow, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          style={[styles.navButton, step === 0 && styles.navButtonDisabled]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.navText}>Föregående</Text>
        </Pressable>
        <Pressable
          onPress={() => setStep((s) => Math.min(SUMMARY_STEP, s + 1))}
          disabled={step === SUMMARY_STEP}
          style={[
            styles.navButton,
            styles.navButtonNext,
            step === SUMMARY_STEP && styles.navButtonDisabled,
          ]}
        >
          <Text style={[styles.navText, styles.navTextNext]}>
            {step === SUMMARY_STEP - 1 ? 'Sammanfattning' : 'Nästa'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

type StatusButtonProps = {
  icon: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
};

function StatusButton({ icon, active, activeColor, onPress }: StatusButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.statusButton,
        active && { backgroundColor: activeColor, borderColor: activeColor },
      ]}
    >
      <Ionicons
        name={icon as never}
        size={18}
        color={active ? colors.bg : colors.textFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textFaint,
  },
  progressTrack: {
    height: 4,
    marginHorizontal: 20,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  content: {
    paddingHorizontal: 20,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionStep: {
    color: colors.textFaint,
    fontSize: 12,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  itemHint: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteInput: {
    backgroundColor: colors.cardRaised,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    minHeight: 40,
  },
  allOk: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: 12,
    marginTop: 2,
  },
  allOkText: {
    color: colors.accent,
    fontWeight: '600',
  },
  noIssues: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  noIssuesText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  issueCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 90, 95, 0.08)',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.3)',
    padding: 12,
  },
  issueText: {
    flex: 1,
  },
  issueTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  issueSection: {
    color: colors.textFaint,
    fontWeight: '400',
    fontSize: 12,
  },
  issueNote: {
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  summaryBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
    marginTop: 4,
  },
  summaryLabel: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    marginTop: 4,
  },
  resetText: {
    color: colors.text,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 13,
  },
  navButtonNext: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    ...shadow.button,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navText: {
    color: colors.text,
    fontWeight: '700',
  },
  navTextNext: {
    color: colors.onAccent,
  },
});
