import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/Screen';
import { displayName, useAuth } from '../store/AuthContext';
import { colors, fonts, radii, spacing } from '../theme';
import { formatPhoneDisplay } from '../utils/phone';

export function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <Screen>
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.brand}>Hesap</Text>
        <Text style={styles.subtitle}>
          Ana kimlik telefon · e-posta bu numaraya bağlı
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Ad soyad</Text>
          <Text style={styles.value}>{displayName(user)}</Text>

          <Text style={styles.label}>Telefon (ana)</Text>
          <Text style={styles.value}>{formatPhoneDisplay(user.phone)}</Text>

          <Text style={styles.label}>Bağlı e-posta</Text>
          <Text style={styles.value}>{user.email}</Text>

          <Text style={styles.label}>Kullanıcı adı</Text>
          <Text style={styles.value}>{user.username}</Text>
        </View>

        <Text style={styles.note}>
          1 telefon = 1 hesap ve 1 aktif rezervasyon.
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 44,
    color: colors.courtDeep,
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    marginTop: 2,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 17,
  },
  note: {
    marginTop: spacing.lg,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
  logout: {
    marginTop: spacing.lg,
    backgroundColor: colors.claySoft,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: fonts.bodyBold,
    color: colors.clay,
    fontSize: 16,
  },
});
