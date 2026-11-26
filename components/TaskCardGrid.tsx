import { Children, ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { taskCardColumns } from '../lib/cardColumns';

type Props = {
  children: ReactNode;
  /** Space between cards, both ways. */
  gap: number;
};

/** Lays task cards out in rows; more than one per row only on big screens. */
export function TaskCardGrid({ children, gap }: Props) {
  const columns = taskCardColumns(useWindowDimensions().width);
  const items = Children.toArray(children);
  if (columns === 1) return <>{items}</>;

  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
          {row.map((item, c) => (
            <View key={c} style={{ flex: 1, minWidth: 0 }}>
              {item}
            </View>
          ))}
          {/* Empty cells keep a short last row's cards the same width. */}
          {Array.from({ length: columns - row.length }, (_, c) => (
            <View key={`empty-${c}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
