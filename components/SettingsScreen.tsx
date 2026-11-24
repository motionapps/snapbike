import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../lib/auth/AuthProvider';
import { colors } from '../lib/theme';
import { PricesScreen } from './PricesScreen';
import { styles } from './SettingsScreen.styles';

/**
 * Settings page, reached from the cog in the browser's top nav. headerRight
 * (the current bike bar) sits in the title row, level with the title.
 */
export function SettingsScreen({ headerRight }: { headerRight?: ReactNode }) {
  const { session, signOut } = useAuth();
  const [showPrices, setShowPrices] = useState(false);
  if (showPrices) return <PricesScreen onBack={() => setShowPrices(false)} headerRight={headerRight} />;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Inställningar</Text>
        {headerRight}
      </View>
      {session?.user.email ? <Text style={styles.email}>{session.user.email}</Text> : null}
      <Pressable onPress={() => setShowPrices(true)} style={styles.linkRow}>
        <Ionicons name="pricetags-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.linkText}>Priser</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </Pressable>
      <Pressable onPress={() => void signOut()} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Logga ut</Text>
      </Pressable>
    </View>
  );
}
