import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { INSPECTION_TEMPLATE } from '../lib/inspection';
import { colors, radius } from '../lib/theme';
import { Job } from '../lib/types';

type Props = {
  job: Job;
  onContinue: () => void;
};

/** Inspection card in the job overview: only items marked with a remark. */
export function InspectionSummary({ job, onContinue }: Props) {
  const sections = INSPECTION_TEMPLATE.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const result = job.inspection?.[item.id];
      return result?.status === 'issue' || !!result?.note;
    }),
  })).filter((section) => section.items.length > 0);

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>BESIKTNING</Text>
      {sections.length === 0 ? (
        <Text style={styles.empty}>Inga anmärkningar</Text>
      ) : (
        sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => {
              const result = job.inspection?.[item.id];
              return (
                <View key={item.id} style={styles.itemRow}>
                  <Ionicons name="alert-circle" size={15} color={colors.danger} />
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {result?.note ? <Text style={styles.note}>{result.note}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}
      <Pressable
        onPress={onContinue}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Ionicons name="clipboard-outline" size={17} color={colors.text} />
        <Text style={styles.buttonText}>Besikta mer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  blockTitle: { color: colors.accent, fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  section: { gap: 6, paddingTop: 4 },
  sectionTitle: { color: colors.text, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: 6 },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { color: colors.text },
  note: { color: colors.textSecondary, fontSize: 13 },
  empty: { color: colors.textFaint },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    paddingVertical: 11,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: colors.text, fontWeight: '600', fontSize: 15 },
});
