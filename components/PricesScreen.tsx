import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AddOn, CONDITION_LABELS, PRICE_FILTERS, ServicePackage } from '../lib/prices';
import { colors } from '../lib/theme';
import { PriceItem } from '../lib/types';
import { PriceTree, rowAction, rowDetail } from './PriceTree';
import { styles } from './PricesScreen.styles';

const conditionText = (conditions: Record<string, string>) =>
  Object.entries(conditions)
    .map(([key, value]) => CONDITION_LABELS.get(`${key}=${value}`) ?? `${key}=${value}`)
    .join(', ');

const standardText = (item: PriceItem) =>
  item.standardProducts
    .map(
      (p) =>
        `${p.quantity > 1 ? `${p.quantity} st ` : ''}${p.name}${p.price !== undefined ? ` ${p.price} kr${p.auto ? '' : ' (vid behov)'}` : ''}`
    )
    .join(' · ');

/** One text row: job rows sit under their part, so they show the action and the detail. */
function PriceRow({ item }: { item: PriceItem }) {
  const isJob = item.kind === 'job';
  const detail = isJob ? rowDetail(item) : conditionText(item.conditions);
  const small =
    item.kind === 'package'
      ? `Ingår: ${(item as ServicePackage).covers.join(', ')}`
      : item.kind === 'add_on'
        ? (item as AddOn).note
        : [
            // Only an override is worth showing; otherwise fram+bak is twice the price.
            item.bothPrice !== undefined && item.bothPrice !== item.price * 2
              ? `fram+bak ${item.bothPrice} kr`
              : '',
            standardText(item),
          ]
            .filter(Boolean)
            .join(' · ');
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>
          {isJob ? rowAction(item) : item.title}
          {detail ? <Text style={styles.rowDetail}>{`  ${detail}`}</Text> : null}
        </Text>
        {small ? <Text style={styles.rowSmall}>{small}</Text> : null}
      </View>
      <Text style={styles.rowPrice}>{item.price} kr</Text>
    </View>
  );
}

/** Read-only view of the price model (assets/price-model), reached from Inställningar. */
export function PricesScreen({ onBack, headerRight }: { onBack: () => void; headerRight?: ReactNode }) {
  const [query, setQuery] = useState('');
  const [filterIndex, setFilterIndex] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.title}>Priser</Text>
        {headerRight}
      </View>
      <View style={styles.controls}>
        <View style={styles.field}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Sök</Text>
          </View>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={17} color={colors.textFaint} />
            <TextInput
              style={styles.search}
              placeholder="Sök del, åtgärd, paket…"
              placeholderTextColor={colors.textFaint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>
        </View>
        <View style={styles.filterWrap}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Cykeltyp</Text>
            {filterIndex !== 0 ? (
              <View style={styles.activeMark}>
                <Ionicons name="checkmark" size={14} color={colors.ok} />
                <Text style={styles.activeMarkText}>filter aktivt</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={() => setFilterOpen((v) => !v)}
            style={[styles.filterButton, filterIndex !== 0 && styles.filterButtonActive]}
          >
            <Text style={styles.filterText}>{PRICE_FILTERS[filterIndex].label}</Text>
            <Ionicons
              name={filterOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
          {filterOpen ? (
            <View style={styles.filterMenu}>
              {PRICE_FILTERS.map((filter, i) => (
                <Pressable
                  key={filter.label}
                  onPress={() => {
                    setFilterIndex(i);
                    setFilterOpen(false);
                  }}
                  style={({ pressed }) => [styles.filterOption, pressed && styles.filterOptionHover]}
                >
                  <View style={styles.filterCheck}>
                    {i === filterIndex ? (
                      <Ionicons name="checkmark" size={18} color={colors.text} />
                    ) : null}
                  </View>
                  <Text style={styles.filterText}>{filter.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <PriceTree
        items={PRICE_FILTERS[filterIndex].rows()}
        query={query}
        renderRow={(item) => <PriceRow item={item} />}
      />
    </View>
  );
}
