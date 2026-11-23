import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../lib/auth/AuthProvider';
import { styles } from './SettingsScreen.styles';

/** Settings page, reached from the cog in the browser's top nav. */
export function SettingsScreen() {
  const { session, signOut } = useAuth();
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Inställningar</Text>
      {session?.user.email ? <Text style={styles.email}>{session.user.email}</Text> : null}
      <Pressable onPress={() => void signOut()} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Logga ut</Text>
      </Pressable>
    </View>
  );
}
