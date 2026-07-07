import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { INSPECTION_TEMPLATE } from '../lib/besiktning';
import { colors, radius } from '../lib/theme';

/**
 * Kompakt guide på anteckningssidan som visar besiktningsordningen medan
 * personalen pratar in: headset på marken först, sedan Bak → Fram i stativet.
 * Ren vägledning – ingen inmatning; det man säger hamnar i transkriptet.
 */
export function InspectionGuide() {
  const [index, setIndex] = useState(0);
  const section = INSPECTION_TEMPLATE[index];
  const last = INSPECTION_TEMPLATE.length - 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heading}>BESIKTNINGSGÅNG</Text>
        <Text style={styles.stepText}>
          {index + 1}/{INSPECTION_TEMPLATE.length}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {INSPECTION_TEMPLATE.map((s, i) => (
          <Pressable
            key={s.key}
            onPress={() => setIndex(i)}
            style={[styles.chip, i === index && styles.chipActive]}
          >
            <Text style={[styles.chipText, i === index && styles.chipTextActive]}>
              {s.short}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <View style={styles.bullet} />
          <Text style={styles.itemText}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemHint}> – {item.hint}</Text>
          </Text>
        </View>
      ))}

      <View style={styles.navRow}>
        <Pressable
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          hitSlop={8}
          style={[styles.navButton, index === 0 && styles.navDisabled]}
        >
          <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => setIndex((i) => Math.min(last, i + 1))}
          disabled={index === last}
          hitSlop={8}
          style={[styles.navButton, index === last && styles.navDisabled]}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepText: {
    color: colors.textFaint,
    fontSize: 11,
  },
  chips: {
    gap: 6,
  },
  chip: {
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 2,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  itemHint: {
    color: colors.textFaint,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  navButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navDisabled: {
    opacity: 0.35,
  },
});
