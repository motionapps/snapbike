import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
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
import { BIKE_BRANDS } from '../lib/bikeBrands';
import { colors } from '../lib/theme';
import { styles } from './BikeDetails.styles';
import {
  DropdownAnchor,
  DropdownMode,
  DropdownOption,
  measureAnchor,
  OptionDropdown,
  SuggestInput,
} from './OptionDropdown';

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

/** One editable row: an option dropdown, a yes/no toggle, or free text with suggestions. */
type Field =
  | {
      label: string;
      kind: 'options';
      options: readonly string[];
      /** How the dropdown behaves; default list. */
      mode?: DropdownMode;
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
      /** Suggested as you type. */
      suggestions: readonly string[];
      get: (bike: Bike) => string;
      set: (bike: Bike, value: string) => Bike;
    };

// The setters cast because each option list matches its field's union type.
const FIELDS: Field[] = [
  {
    label: 'Märke',
    // Free text: not every brand is in the list.
    kind: 'text',
    suggestions: BIKE_BRANDS,
    get: (b) => b.brand,
    set: (b, v) => ({ ...b, brand: v }),
  },
  {
    label: 'Typ',
    kind: 'options',
    options: BIKE_TYPE_OPTIONS,
    mode: 'filter',
    get: (b) => b.bike_type,
    set: (b, v) => ({ ...b, bike_type: v as Bike['bike_type'] }),
  },
  {
    label: 'Färg',
    kind: 'options',
    options: COMMON_COLORS,
    mode: 'filter',
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
  // Fully open: stop clipping so the brand suggestions can float past the rows.
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!expandNonce || state.status !== 'ready') return;
    setExpanded(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => finished && setOpen(true));
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
    setOpen(false);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      // Height can't run on the native driver.
      useNativeDriver: false,
    }).start(({ finished }) => finished && setOpen(next));
  };

  const onContentLayout = (event: LayoutChangeEvent) => {
    setContentHeight(event.nativeEvent.layout.height);
  };

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.root}>
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
          open && styles.bodyOpen,
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
          <View style={styles.divider} />
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

/** Space between the columns when the rows lay out in more than one. */
const COLUMN_GAP = 24;

type OptionsField = Extract<Field, { kind: 'options' }>;

// Built once per list: the brand list has thousands of entries.
const suggestionCache = new Map<readonly string[], DropdownOption[]>();
function suggestionOptions(values: readonly string[]): DropdownOption[] {
  let options = suggestionCache.get(values);
  if (!options) {
    options = values.map((value) => ({ value, label: value }));
    suggestionCache.set(values, options);
  }
  return options;
}
type Dropdown = { field: OptionsField; anchor: DropdownAnchor };

/** The bike's fields as rows: brand is typed inline, options open a dropdown under the row. */
export function BikeFieldRows({ bike, onChange }: RowsProps) {
  const [dropdown, setDropdown] = useState<Dropdown | null>(null);
  const [width, setWidth] = useState(0);
  const readOnly = !onChange;
  // Wider containers lay the rows out in 2 or 3 columns.
  const columns = width >= 960 ? 3 : width >= 620 ? 2 : 1;
  const cellWidth =
    columns > 1 ? Math.floor((width - COLUMN_GAP * (columns - 1)) / columns) : undefined;
  const options = (dropdown?.field.options ?? []).map((option) => ({
    value: option,
    label: label(option),
    leading: <Swatch value={option} />,
  }));

  return (
    <>
      <View
        style={[styles.grid, columns > 1 && { columnGap: COLUMN_GAP }]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {FIELDS.map((field, index) => (
          <View
            key={field.label}
            style={[
              styles.cell,
              { width: cellWidth ?? '100%' },
              // Above the cells after it, so its suggestions float over them.
              field.kind === 'text' && styles.cellOnTop,
            ]}
          >
            <FieldRow
              field={field}
              bike={bike}
              divider={index >= columns}
              onChange={onChange}
              onOpen={setDropdown}
              readOnly={readOnly}
            />
          </View>
        ))}
      </View>
      <OptionDropdown
        anchor={dropdown?.anchor ?? null}
        options={options}
        mode={dropdown?.field.mode}
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
          <SuggestInput
            style={[styles.rowValue, styles.rowInput]}
            value={field.get(bike)}
            onChangeText={(text) => onChange?.(field.set(bike, text))}
            options={suggestionOptions(field.suggestions)}
            placeholder="Skriv märke"
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
    measureAnchor(ref, (anchor) => onOpen({ field, anchor }));
  };

  const value = field.kind === 'boolean' ? yesNo(field.get(bike)) : label(field.get(bike));

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={readOnly}
      style={({ pressed }) => [
        ...rowStyle,
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

