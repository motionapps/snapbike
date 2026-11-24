import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ReactNode, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ACTION_NAMES, PARTS, PricePart } from '../lib/prices';
import { categoryImageUrl } from '../lib/taskImages';
import { categoryColor, colors } from '../lib/theme';
import { PriceItem } from '../lib/types';
import { webScroll, webScrollContent } from '../lib/webEdge';
import { styles } from './PriceTree.styles';

const IS_WEB = Platform.OS === 'web';

const childrenOf = (id: string | null) => PARTS.filter((part) => part.parentId === id);

/** A job row's action name, e.g. "Byt". */
export const rowAction = (item: PriceItem) =>
  ACTION_NAMES.get(item.actionId ?? '') ?? item.actionId ?? item.title;

/** Conditions that say what the part sits on, not which part it is. */
const MOUNTED_ON = ['brake_type'];

/**
 * "Byt bromsbelägg (skivbroms)" under the part "Bromsbelägg" → "bromsbelägg på
 * skivbroms", so it can't be read as "Byt skivbroms".
 */
export const rowDetail = (item: PriceItem) => {
  const match = item.title.match(/\((.*)\)$/);
  const detail = match ? match[1] : '';
  if (!detail || !MOUNTED_ON.some((key) => key in item.conditions)) return detail;
  const part = PARTS.find((p) => p.id === item.partId);
  return part ? `${part.name.toLowerCase()} på ${detail}` : detail;
};

type Props = {
  /** The rows that may be shown (bike filter already applied). */
  items: PriceItem[];
  query: string;
  /** One row; packages and add-ons are rows too, under Service and Tillägg. */
  renderRow: (item: PriceItem) => ReactNode;
};

/**
 * Category chips (Alla, Broms, Drivlina …) above the price model as a tree:
 * collapsible top groups, the group's own rows and sub-part headings one step
 * in, sub-part rows another step in. Used by Priser and Lägg till jobb.
 */
export function PriceTree({ items, query, renderRow }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const q = query.trim().toLowerCase();

  const matches = (texts: (string | undefined)[]) =>
    !q || texts.some((text) => text?.toLowerCase().includes(q));

  const searched = items.filter((item) => {
    if (item.kind === 'package') return matches([item.title, 'paket', 'service']);
    if (item.kind === 'add_on') return matches([item.title, 'tillägg']);
    const part = PARTS.find((p) => p.id === item.partId);
    return matches([
      item.title,
      part?.name,
      item.category,
      item.label,
      ...item.standardProducts.map((p) => p.name),
    ]);
  });

  /** Visible job rows per part id. */
  const rowsByPart = new Map<string, PriceItem[]>();
  searched.forEach((item) => {
    if (item.kind !== 'job' || !item.partId) return;
    rowsByPart.set(item.partId, [...(rowsByPart.get(item.partId) ?? []), item]);
  });
  const packages = searched.filter((item) => item.kind === 'package');
  const addOns = searched.filter((item) => item.kind === 'add_on');

  const countRows = (part: PricePart): number =>
    (rowsByPart.get(part.id)?.length ?? 0) +
    childrenOf(part.id).reduce((sum, child) => sum + countRows(child), 0);

  // Chips: every category that has rows, before the category filter.
  const groups = childrenOf(null).filter((group) => countRows(group) > 0);
  const chips = [
    ...groups.map((group) => ({ id: group.id, name: group.name })),
    ...(packages.length ? [{ id: 'packages', name: 'Service' }] : []),
    ...(addOns.length ? [{ id: 'add_ons', name: 'Tillägg' }] : []),
  ];
  const shown = (name: string) => category === null || category === name;

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderPart = (part: PricePart, isGroup: boolean): ReactNode => {
    if (countRows(part) === 0) return null;
    return (
      <View key={part.id}>
        {isGroup ? null : <Text style={styles.partName}>{part.name}</Text>}
        <View style={styles.child}>
          {(rowsByPart.get(part.id) ?? []).map((item) => (
            <View key={item.title}>{renderRow(item)}</View>
          ))}
          {childrenOf(part.id).map((child) => renderPart(child, false))}
        </View>
      </View>
    );
  };

  const section = (id: string, name: string, count: number, body: ReactNode) => {
    const isOpen = !!q || category !== null || open.has(id);
    const accent = categoryColor(name);
    return (
      <View key={id} style={[styles.group, { borderColor: accent }]}>
        <Pressable onPress={() => toggle(id)} style={styles.groupHeader}>
          <View style={[styles.groupDot, { backgroundColor: accent }]} />
          <Text style={styles.groupName}>{name}</Text>
          <Text style={styles.groupCount}>{count}</Text>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
        {isOpen ? <View style={styles.groupBody}>{body}</View> : null}
      </View>
    );
  };

  /** A category chip in its group colour, with a product photo; null = Alla. */
  const chip = (entry: { id: string; name: string } | null) => {
    const name = entry?.name ?? null;
    const isActive = category === name;
    const accent = name ? categoryColor(name) : colors.accentLight;
    return (
      <Pressable
        key={entry?.id ?? 'all'}
        onPress={() => setCategory(isActive ? null : name)}
        style={[styles.chip, { borderColor: accent }, isActive && { backgroundColor: accent }]}
      >
        {entry ? (
          <Image
            source={{ uri: categoryImageUrl(entry.id) }}
            style={styles.chipImage}
            contentFit="contain"
          />
        ) : null}
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{name ?? 'Alla'}</Text>
      </Pressable>
    );
  };
  const chipList = [chip(null), ...chips.map(chip)];

  const nothing = chips.length === 0;

  return (
    <ScrollView
      style={webScroll}
      contentContainerStyle={[styles.list, webScrollContent]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* The chips scroll away with the list, leaving room for the rows. */}
      {/* A mouse can't scroll sideways, so the browser wraps the chips instead. */}
      {IS_WEB ? (
        <View style={[styles.chipRow, styles.chipWrap]}>{chipList}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
          style={styles.chipScroll}
        >
          {chipList}
        </ScrollView>
      )}
      {groups
        .filter((group) => shown(group.name))
        .map((group) => section(group.id, group.name, countRows(group), renderPart(group, true)))}
      {packages.length > 0 && shown('Service')
        ? section(
            'packages',
            'Service',
            packages.length,
            packages.map((item) => <View key={item.title}>{renderRow(item)}</View>),
          )
        : null}
      {addOns.length > 0 && shown('Tillägg')
        ? section(
            'add_ons',
            'Tillägg',
            addOns.length,
            addOns.map((item) => <View key={item.title}>{renderRow(item)}</View>),
          )
        : null}
      {nothing ? <Text style={styles.empty}>Inga träffar</Text> : null}
    </ScrollView>
  );
}
