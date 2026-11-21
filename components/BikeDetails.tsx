import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BIKE_TYPE_OPTIONS,
  BRAKE_BACK_OPTIONS,
  BRAKE_FRONT_OPTIONS,
  BikeData,
  COMMON_COLORS,
  GEAR_BACK_OPTIONS,
  GEAR_FRONT_OPTIONS,
} from '../lib/bikeAnalysis';
import { BikeOptionPicker, PickerRequest } from './BikeOptionPicker';
import { colors } from '../lib/theme';

export type BikeAnalysisState =
  | { status: 'idle' }
  | { status: 'analyzing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; bike: BikeData };

type Props = {
  state: BikeAnalysisState;
  onRetry: () => void;
  /** Omitted = read-only rows. */
  onChange?: (data: BikeData) => void;
  /** Shows an edit button in the header's right corner. */
  onEdit?: () => void;
  /** Changing it to a non-zero value expands the details. */
  expandNonce?: number;
};

// Swedish display labels for the prototype's English option values.
const LABELS: Record<string, string> = {
  'road bike': 'Racercykel',
  'mountain bike': 'Mountainbike',
  'hybrid bike': 'Hybridcykel',
  'city bike': 'Stadscykel',
  'kids bike': 'Barncykel',
  'cargo bike': 'Lastcykel',
  black: 'Svart', white: 'Vit', red: 'Röd', blue: 'Blå', green: 'Grön',
  yellow: 'Gul', orange: 'Orange', purple: 'Lila', pink: 'Rosa', brown: 'Brun',
  gray: 'Grå', silver: 'Silver', gold: 'Guld', navy: 'Marinblå',
  maroon: 'Vinröd', teal: 'Blågrön', lime: 'Limegrön', cyan: 'Cyan',
  magenta: 'Magenta', beige: 'Beige',
  none: 'Ingen',
  external: 'Utvändig',
  hub: 'Nav',
  'mechanical disc': 'Mekanisk skivbroms',
  'hydraulic disc': 'Hydraulisk skivbroms',
  'roller brake': 'Rullbroms',
  'mechanical rim': 'Fälgbroms',
  'foot brake': 'Fotbroms',
};

export const bikeLabel = (value: string) => LABELS[value] ?? value;
const label = bikeLabel;
const yesNo = (value: boolean) => (value ? 'Ja' : 'Nej');

type Bike = BikeData['bike'];

/** One editable row: an option list, a yes/no toggle, or free text. */
type Field =
  | {
      label: string;
      kind: 'options';
      options: readonly string[];
      get: (bike: Bike) => string;
      set: (bike: Bike, value: string) => Bike;
    }
  | {
      label: string;
      kind: 'boolean';
      get: (bike: Bike) => boolean;
      set: (bike: Bike, value: boolean) => Bike;
    }
  | {
      label: string;
      kind: 'text';
      get: (bike: Bike) => string;
      set: (bike: Bike, value: string) => Bike;
    };

// The setters cast because each option list matches its field's union type.
const FIELDS: Field[] = [
  {
    label: 'Märke',
    kind: 'text',
    get: (b) => b.brand,
    set: (b, v) => ({ ...b, brand: v }),
  },
  {
    label: 'Typ',
    kind: 'options',
    options: BIKE_TYPE_OPTIONS,
    get: (b) => b.bike_type,
    set: (b, v) => ({ ...b, bike_type: v as Bike['bike_type'] }),
  },
  {
    label: 'Färg',
    kind: 'options',
    options: COMMON_COLORS,
    get: (b) => b.color,
    set: (b, v) => ({ ...b, color: v as Bike['color'] }),
  },
  {
    label: 'Växel fram',
    kind: 'options',
    options: GEAR_FRONT_OPTIONS,
    get: (b) => b.gears.front,
    set: (b, v) => ({ ...b, gears: { ...b.gears, front: v as Bike['gears']['front'] } }),
  },
  {
    label: 'Växel bak',
    kind: 'options',
    options: GEAR_BACK_OPTIONS,
    get: (b) => b.gears.back,
    set: (b, v) => ({ ...b, gears: { ...b.gears, back: v as Bike['gears']['back'] } }),
  },
  {
    label: 'Broms fram',
    kind: 'options',
    options: BRAKE_FRONT_OPTIONS,
    get: (b) => b.brakes.front,
    set: (b, v) => ({ ...b, brakes: { ...b.brakes, front: v as Bike['brakes']['front'] } }),
  },
  {
    label: 'Broms bak',
    kind: 'options',
    options: BRAKE_BACK_OPTIONS,
    get: (b) => b.brakes.back,
    set: (b, v) => ({ ...b, brakes: { ...b.brakes, back: v as Bike['brakes']['back'] } }),
  },
  {
    label: 'Dämpning fram',
    kind: 'boolean',
    get: (b) => b.dampers.front,
    set: (b, v) => ({ ...b, dampers: { ...b.dampers, front: v } }),
  },
  {
    label: 'Dämpning bak',
    kind: 'boolean',
    get: (b) => b.dampers.back,
    set: (b, v) => ({ ...b, dampers: { ...b.dampers, back: v } }),
  },
  {
    label: 'Elcykel',
    kind: 'boolean',
    get: (b) => b.electric,
    set: (b, v) => ({ ...b, electric: v }),
  },
];

/** Footer under the bike photo: "Mer information" that expands to the analysis. */
export function BikeDetails({ state, onRetry, onChange, onEdit, expandNonce }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const [picker, setPicker] = useState<PickerRequest | null>(null);

  useEffect(() => {
    if (!expandNonce || state.status !== 'ready') return;
    setExpanded(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expandNonce, state.status]);

  if (state.status === 'idle') return null;

  if (state.status === 'analyzing') {
    return (
      <View style={styles.header}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.headerFaint}>Analyserar cykeln…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <Pressable onPress={onRetry} style={styles.header}>
        <Ionicons name="warning-outline" size={16} color={colors.danger} />
        <Text style={styles.errorText} numberOfLines={2}>
          Kunde inte analysera bilden – tryck för att försöka igen
        </Text>
        <Ionicons name="refresh" size={16} color={colors.textSecondary} />
      </Pressable>
    );
  }

  const { bike } = state.bike;
  const update = (next: Bike) => onChange?.({ ...state.bike, bike: next });
  const readOnly = !onChange;

  const onFieldPress = (field: Field) => {
    if (field.kind === 'boolean') {
      update(field.set(bike, !field.get(bike)));
    } else if (field.kind === 'text') {
      setPicker({
        kind: 'text',
        title: field.label,
        value: field.get(bike),
        onPick: (value) => update(field.set(bike, value)),
      });
    } else {
      setPicker({
        kind: 'options',
        title: field.label,
        value: field.get(bike),
        options: field.options,
        labelFor: label,
        onPick: (value) => update(field.set(bike, value)),
      });
    }
  };

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      // Height can't run on the native driver.
      useNativeDriver: false,
    }).start();
  };

  const onContentLayout = (event: LayoutChangeEvent) => {
    setContentHeight(event.nativeEvent.layout.height);
  };

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View>
      <Pressable onPress={toggle} style={styles.header} hitSlop={4}>
        <Ionicons name="sparkles" size={15} color={colors.accent} />
        <Text style={styles.headerText}>Information om cykeln</Text>
        {onEdit ? (
          <Pressable onPress={onEdit} hitSlop={8} style={styles.editButton}>
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        <Animated.View style={[styles.chevron, { transform: [{ rotate }] }]}>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.body,
          {
            height: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, contentHeight],
            }),
            opacity: progress,
          },
        ]}
        pointerEvents={expanded ? 'auto' : 'none'}
      >
        {/* Absolutely positioned so it lays out at its natural height. */}
        <View style={styles.content} onLayout={onContentLayout}>
          {FIELDS.map((field, index) => {
            const value =
              field.kind === 'boolean'
                ? yesNo(field.get(bike))
                : field.kind === 'text'
                  ? field.get(bike) || '–'
                  : label(field.get(bike));
            return (
              <Pressable
                key={field.label}
                onPress={() => onFieldPress(field)}
                disabled={readOnly}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text style={styles.rowLabel}>{field.label}</Text>
                <Text style={styles.rowValue}>{value}</Text>
                {readOnly ? null : (
                  <Ionicons
                    name={field.kind === 'boolean' ? 'swap-horizontal' : 'chevron-forward'}
                    size={18}
                    color={colors.textFaint}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <BikeOptionPicker request={picker} onClose={() => setPicker(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  headerText: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
  headerFaint: {
    flex: 1,
    color: colors.textSecondary,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  editButton: {
    paddingHorizontal: 4,
  },
  chevron: {
    width: 18,
    height: 18,
  },
  body: {
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.cardRaised,
  },
  rowLabel: {
    width: 130,
    color: colors.textSecondary,
    fontSize: 16,
  },
  rowValue: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
