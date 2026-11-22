import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { INSPECTION_TEMPLATE } from '../lib/inspection';
import { colors } from '../lib/theme';
import { styles } from './InspectionGuide.styles';

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
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => setIndex((i) => Math.min(last, i + 1))}
          disabled={index === last}
          hitSlop={8}
          style={[styles.navButton, index === last && styles.navDisabled]}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}
