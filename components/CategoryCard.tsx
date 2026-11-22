import { ReactNode } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { categoryColor } from '../lib/theme';
import { styles } from './CategoryCard.styles';

/**
 * BikeOffice border-accent card: a 2px frame and a depth strip behind the
 * right edge in the category's color, with the category as a tag on top.
 */
export function CategoryCard({
  category,
  style,
  children,
}: {
  category: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const accent = categoryColor(category);
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.depth, { backgroundColor: accent }]} />
      <View style={[styles.card, { borderColor: accent }]}>{children}</View>
      {category ? (
        <View style={[styles.tag, { backgroundColor: accent }]}>
          <Text style={styles.tagText}>{category}</Text>
        </View>
      ) : null}
    </View>
  );
}
