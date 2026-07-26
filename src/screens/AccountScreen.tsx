import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { displayName, useAuth } from '../store/AuthContext';
import { colors, spacing } from '../theme';
import { formatPhoneDisplay } from '../utils/phone';

export function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Hesabım</Text>
      <Text style={styles.subtitle}>Profil bilgilerin</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Ad soyad</Text>
        <Text style={styles.value}>{displayName(user)}</Text>

        <Text style={styles.label}>Kullanıcı adı</Text>
        <Text style={styles.value}>{user.username}</Text>

        <Text style={styles.label}>Telefon</Text>
        <Text style={styles.value}>{formatPhoneDisplay(user.phone)}</Text>

        <Text style={styles.label}>E-posta</Text>
        <Text style={styles.value}>{user.email}</Text>
      </View>

      <Text style={styles.note}>
        Kural: 1 telefon numarası aynı anda yalnızca 1 aktif rezervasyon alabilir.
      </Text>

      <Pressable
        onPress={() =>
          Alert.alert('Çıkış yap', 'Hesabından çıkmak istiyor musun?', [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Çıkış yap',
              style: 'destructive',
              onPress: () => logout(),
            },
          ])
        }
        style={styles.logout}
      >
        <Text style={styles.logoutText}>Çıkış yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: spacing.md,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  note: {
    marginTop: spacing.lg,
    color: colors.muted,
    lineHeight: 20,
  },
  logout: {
    marginTop: spacing.lg,
    backgroundColor: colors.booked,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.clay,
    fontWeight: '800',
    fontSize: 16,
  },
});
