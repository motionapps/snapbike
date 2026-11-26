import { Ionicons } from '@expo/vector-icons';
import { ReactNode, RefObject, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../lib/theme';
import { styles } from './OptionDropdown.styles';

/** Where the list drops down: right under the pressed row, in window coordinates. */
export type DropdownAnchor = { x: number; y: number; width: number };

export type DropdownOption = {
  value: string;
  label: string;
  /** Shown before the label, e.g. a colour swatch. */
  leading?: ReactNode;
};

/**
 * list:   just the options (few of them, e.g. Växel bak).
 * filter: the options with a search field on top that narrows them (e.g. Färg, Typ).
 * Free text with suggestions (e.g. Märke) is SuggestInput below.
 */
export type DropdownMode = 'list' | 'filter';

/** Measures the pressed row and gives the anchor just under it. */
export function measureAnchor(ref: RefObject<View | null>, onMeasured: (anchor: DropdownAnchor) => void) {
  ref.current?.measureInWindow((x, y, width, height) => onMeasured({ x, y: y + height, width }));
}

/** Lowercase without accents, so "cervelo" finds "Cervélo". */
const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Options whose label contains the query, those starting with it first. */
function matchOptions(options: DropdownOption[], query: string): DropdownOption[] {
  const q = normalize(query);
  const starts: DropdownOption[] = [];
  const contains: DropdownOption[] = [];
  for (const option of options) {
    const label = normalize(option.label);
    if (label.startsWith(q)) starts.push(option);
    else if (label.includes(q)) contains.push(option);
  }
  return [...starts, ...contains];
}

type Keys = {
  count: number;
  /** -1 (nothing highlighted) is a stop too: the typed text in SuggestInput. */
  allowNone: boolean;
  setHighlight: (update: (current: number) => number) => void;
  /** Return true when Enter was used, so its default is stopped. */
  onEnter: () => boolean;
  onEscape: () => void;
};

/** Arrow up/down, Enter and Escape while a list is open. React Native only reports these keys on web. */
function useDropdownKeys(active: boolean, keys: Keys) {
  const latest = useRef(keys);
  latest.current = keys;
  useEffect(() => {
    if (!active || Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const { count, allowNone, setHighlight, onEnter, onEscape } = latest.current;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setHighlight((current) =>
          count ? Math.min(count - 1, Math.max(allowNone ? -1 : 0, current + step)) : -1,
        );
      } else if (event.key === 'Enter') {
        if (onEnter()) event.preventDefault();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);
}

type RowsProps = {
  options: DropdownOption[];
  value: string;
  highlight: number;
  onPick: (value: string) => void;
  /** Picks on touch-down: SuggestInput's list must act before its input's blur hides it. */
  pickOnPressIn?: boolean;
};

/** The option rows, scrolling so the highlighted one stays in view. */
function DropdownRows({ options, value, highlight, onPick, pickOnPressIn }: RowsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const rowTops = useRef<number[]>([]);
  const rowHeights = useRef<number[]>([]);
  const scrollY = useRef(0);
  const viewHeight = useRef(0);

  useEffect(() => {
    const top = rowTops.current[highlight];
    const height = rowHeights.current[highlight];
    if (top === undefined || height === undefined) return;
    if (top < scrollY.current) scrollRef.current?.scrollTo({ y: top, animated: false });
    else if (top + height > scrollY.current + viewHeight.current)
      scrollRef.current?.scrollTo({ y: top + height - viewHeight.current, animated: false });
  }, [highlight]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      onScroll={(event) => (scrollY.current = event.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
      onLayout={(event) => (viewHeight.current = event.nativeEvent.layout.height)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const pick = () => onPick(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={pickOnPressIn ? undefined : pick}
            onPressIn={pickOnPressIn ? pick : undefined}
            onLayout={(event) => {
              rowTops.current[index] = event.nativeEvent.layout.y;
              rowHeights.current[index] = event.nativeEvent.layout.height;
            }}
            style={({ pressed }) => [
              styles.dropdownOption,
              index > 0 && styles.dropdownDivider,
              (pressed || index === highlight) && styles.dropdownOptionPressed,
            ]}
          >
            {option.leading}
            <Text style={[styles.dropdownText, selected && styles.dropdownTextSelected]}>
              {option.label}
            </Text>
            {selected ? <Ionicons name="checkmark" size={20} color={colors.accentLight} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type Props = {
  /** null = closed. */
  anchor: DropdownAnchor | null;
  options: DropdownOption[];
  value: string;
  /** Default list. */
  mode?: DropdownMode;
  onPick: (value: string) => void;
  onClose: () => void;
};

const DROPDOWN_MIN = 160;
// Half the ~300 ms of the built-in modal fade.
const DROPDOWN_FADE_MS = 150;

/**
 * Option list over everything else, dropping down right under the pressed row.
 * Arrow up/down moves the highlight, Enter picks it and Escape closes (keyboard on web).
 */
export function OptionDropdown({ anchor, options, value, mode = 'list', onPick, onClose }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState('');
  /** -1 = nothing highlighted. */
  const [highlight, setHighlight] = useState(-1);

  const typed = query.trim();
  const shown = mode === 'filter' && typed ? matchOptions(options, typed) : options;

  // Open: the current value starts highlighted.
  useEffect(() => {
    if (!anchor) return;
    setQuery('');
    setHighlight(options.findIndex((option) => option.value === value));
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: DROPDOWN_FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anchor]);

  const submit = () => {
    const option = shown[highlight];
    if (option) onPick(option.value);
    return true;
  };

  useDropdownKeys(!!anchor, {
    count: shown.length,
    allowNone: false,
    setHighlight,
    onEnter: submit,
    onEscape: onClose,
  });

  if (!anchor) return null;

  // As tall as the space below the row allows, so a list that fits needs no scrolling.
  const below = windowHeight - anchor.y - 24;
  const maxHeight = Math.max(below, DROPDOWN_MIN);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.dropdownBackdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.dropdown,
          { top: anchor.y, left: anchor.x, width: anchor.width, maxHeight, opacity },
        ]}
      >
        {mode === 'filter' ? (
          <View style={[styles.dropdownFilterRow, shown.length > 0 && styles.dropdownFilterRowDivider]}>
            <Ionicons name="search" size={16} color={colors.textFaint} />
            <TextInput
              style={styles.dropdownFilter}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                // The best match is ready for Enter.
                setHighlight(text.trim() ? 0 : -1);
              }}
              // Enter is handled by the key listener on web.
              onSubmitEditing={Platform.OS === 'web' ? undefined : submit}
              placeholder="Filtrera…"
              placeholderTextColor={colors.textFaint}
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
            />
          </View>
        ) : null}
        <DropdownRows options={shown} value={value} highlight={highlight} onPick={onPick} />
      </Animated.View>
    </Modal>
  );
}

type SuggestProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** Suggestions; any text is still allowed. */
  options: DropdownOption[];
  placeholder?: string;
  style?: StyleProp<TextStyle>;
};

/** Typed characters before suggestions show. */
const SUGGEST_MIN = 2;
const SUGGEST_MAX = 50;
// About five rows; more scroll.
const SUGGEST_HEIGHT = 250;

/**
 * Free-text field whose matches float in the same dropdown under it from two typed characters.
 * The field keeps focus. Its parents must not clip it, and the row holding it must sit above
 * the rows after it (zIndex).
 */
export function SuggestInput({ value, onChangeText, options, placeholder, style }: SuggestProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  /** Escape or a pick hides the list until the text changes again. */
  const [dismissed, setDismissed] = useState(false);
  /** -1 = the typed text itself. */
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const typed = value.trim();
  const shown =
    focused && !dismissed && normalize(typed).length >= SUGGEST_MIN
      ? matchOptions(options, typed)
          .filter((option) => normalize(option.label) !== normalize(typed))
          .slice(0, SUGGEST_MAX)
      : [];
  const open = shown.length > 0;

  const pick = (picked: string) => {
    clearTimeout(blurTimer.current);
    onChangeText(picked);
    setDismissed(true);
    setHighlight(-1);
    inputRef.current?.blur();
  };

  useDropdownKeys(open, {
    count: shown.length,
    allowNone: true,
    setHighlight,
    // Nothing highlighted: Enter keeps the typed text as usual.
    onEnter: () => {
      const option = shown[highlight];
      if (!option) return false;
      pick(option.value);
      return true;
    },
    onEscape: () => setDismissed(true),
  });

  return (
    <View style={styles.suggestWrap}>
      <TextInput
        ref={inputRef}
        style={style}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setDismissed(false);
          setHighlight(-1);
        }}
        onFocus={() => {
          clearTimeout(blurTimer.current);
          setFocused(true);
        }}
        // A moment's delay, so a tap on a suggestion that steals focus still lands.
        onBlur={() => {
          blurTimer.current = setTimeout(() => setFocused(false), 200);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoCorrect={false}
        returnKeyType="done"
      />
      {open ? (
        <View style={[styles.dropdown, styles.suggestList, { maxHeight: SUGGEST_HEIGHT }]}>
          <DropdownRows
            options={shown}
            value={value}
            highlight={highlight}
            onPick={pick}
            pickOnPressIn
          />
        </View>
      ) : null}
    </View>
  );
}
