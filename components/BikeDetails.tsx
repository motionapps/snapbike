import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
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
import { colors } from '../lib/theme';
import { styles } from './BikeDetails.styles';

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

// Swatch colour for each COMMON_COLORS value.
const SWATCHES: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', red: '#E53935', blue: '#1E63D6',
  green: '#2E9E4F', yellow: '#F5D90A', orange: '#F28C1B', purple: '#8E44AD',
  pink: '#F48FB1', brown: '#7B4A2A', gray: '#8A8F96', silver: '#C9CDD2',
  gold: '#D4AF37', navy: '#1B2A55', maroon: '#7A1F2B', teal: '#138A8A',
  lime: '#A4D233', cyan: '#2EC4E6', magenta: '#D6339C', beige: '#E8D9B5',
};

function Swatch({ value }: { value: string }) {
  const color = SWATCHES[value];
  if (!color) return null;
  return <View style={[styles.swatch, { backgroundColor: color }]} />;
}
const label = bikeLabel;
const yesNo = (value: boolean) => (value ? 'Ja' : 'Nej');

type Bike = BikeData['bike'];

/** One editable row: an option list, a yes/no toggle, or free text. */
type Field =
  | {
      label: string;
      kind: 'options';
      options: readonly string[];
      /** Shows a free-text filter at the top of the dropdown. */
      filterable?: boolean;
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
    filterable: true,
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
        <ActivityIndicator size="small" color={colors.accentLight} />
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
  const update = onChange ? (next: Bike) => onChange({ ...state.bike, bike: next }) : undefined;

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
        <Ionicons name="sparkles" size={15} color={colors.accentLight} />
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
          <BikeFieldRows bike={bike} onChange={update} />
        </View>
      </Animated.View>
    </View>
  );
}

type RowsProps = {
  bike: Bike;
  /** Omitted = read-only rows. */
  onChange?: (bike: Bike) => void;
};

type OptionsField = Extract<Field, { kind: 'options' }>;
type Dropdown = { field: OptionsField; x: number; y: number; width: number };

/** The bike's fields as rows: brand is edited inline, options open a dropdown under the row. */
export function BikeFieldRows({ bike, onChange }: RowsProps) {
  const [dropdown, setDropdown] = useState<Dropdown | null>(null);
  const readOnly = !onChange;

  return (
    <>
      {FIELDS.map((field, index) => (
        <FieldRow
          key={field.label}
          field={field}
          bike={bike}
          divider={index > 0}
          onChange={onChange}
          onOpen={setDropdown}
          readOnly={readOnly}
        />
      ))}
      <OptionDropdown
        dropdown={dropdown}
        value={dropdown ? dropdown.field.get(bike) : ''}
        onPick={(value) => {
          if (dropdown && onChange) onChange(dropdown.field.set(bike, value));
          setDropdown(null);
        }}
        onClose={() => setDropdown(null)}
      />
    </>
  );
}

type FieldRowProps = {
  field: Field;
  bike: Bike;
  divider: boolean;
  readOnly: boolean;
  onChange?: (bike: Bike) => void;
  onOpen: (dropdown: Dropdown) => void;
};

function FieldRow({ field, bike, divider, readOnly, onChange, onOpen }: FieldRowProps) {
  const ref = useRef<View>(null);
  const rowStyle = [styles.row, divider && styles.rowDivider];

  if (field.kind === 'text') {
    return (
      <View style={rowStyle}>
        <Text style={styles.rowLabel}>{field.label}</Text>
        {readOnly ? (
          <Text style={styles.rowValue}>{field.get(bike) || '–'}</Text>
        ) : (
          <TextInput
            style={[styles.rowValue, styles.rowInput]}
            value={field.get(bike)}
            onChangeText={(text) => onChange?.(field.set(bike, text))}
            placeholder="Skriv märke"
            placeholderTextColor={colors.textFaint}
            autoCorrect={false}
            returnKeyType="done"
          />
        )}
      </View>
    );
  }

  const onPress = () => {
    if (!onChange) return;
    if (field.kind === 'boolean') {
      onChange(field.set(bike, !field.get(bike)));
      return;
    }
    ref.current?.measureInWindow((x, y, width, height) => {
      onOpen({ field, x, y: y + height, width });
    });
  };

  const value = field.kind === 'boolean' ? yesNo(field.get(bike)) : label(field.get(bike));

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={readOnly}
      style={({ pressed }) => [
        ...rowStyle,
        field.kind === 'boolean' && (field.get(bike) ? styles.rowYes : styles.rowNo),
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={styles.rowLabel}>{field.label}</Text>
      <View style={styles.rowValueWrap}>
        {field.kind === 'options' ? <Swatch value={field.get(bike)} /> : null}
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      {readOnly ? null : (
        <Ionicons
          name={field.kind === 'boolean' ? 'swap-horizontal' : 'chevron-down'}
          size={18}
          color={colors.textFaint}
        />
      )}
    </Pressable>
  );
}

type DropdownProps = {
  dropdown: Dropdown | null;
  value: string;
  onPick: (value: string) => void;
  onClose: () => void;
};

const DROPDOWN_MAX = 320;
const DROPDOWN_MIN = 160;
// Half the ~300 ms of the built-in modal fade.
const DROPDOWN_FADE_MS = 150;

/** Option list over everything else, dropping down right under the pressed row. */
function OptionDropdown({ dropdown, value, onPick, onClose }: DropdownProps) {
  const { height: windowHeight } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!dropdown) return;
    setFilter('');
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: DROPDOWN_FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dropdown]);

  if (!dropdown) return null;

  const below = windowHeight - dropdown.y - 24;
  const maxHeight = Math.min(DROPDOWN_MAX, Math.max(below, DROPDOWN_MIN));
  const query = filter.trim().toLowerCase();
  const options = query
    ? dropdown.field.options.filter((option) => label(option).toLowerCase().includes(query))
    : dropdown.field.options;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.dropdownBackdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.dropdown,
          { top: dropdown.y, left: dropdown.x, width: dropdown.width, maxHeight, opacity },
        ]}
      >
        {dropdown.field.filterable ? (
          <View style={styles.dropdownFilterRow}>
            <Ionicons name="search" size={16} color={colors.textFaint} />
            <TextInput
              style={styles.dropdownFilter}
              value={filter}
              onChangeText={setFilter}
              placeholder="Filtrera…"
              placeholderTextColor={colors.textFaint}
              autoCorrect={false}
            />
          </View>
        ) : null}
        <ScrollView keyboardShouldPersistTaps="handled">
          {options.map((option, index) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                onPress={() => onPick(option)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  index > 0 && styles.dropdownDivider,
                  pressed && styles.rowPressed,
                ]}
              >
                <Swatch value={option} />
                <Text style={[styles.dropdownText, selected && styles.dropdownTextSelected]}>
                  {label(option)}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark" size={20} color={colors.accentLight} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
