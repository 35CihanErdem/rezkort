import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '../components/Screen';
import { displayName, useAuth } from '../context/AuthContext';
import { colors, fonts, radii, spacing } from '../theme';
import { formatPhoneDisplay } from '../utils/phone';
import { roleLabel } from '../utils/roles';

export function AccountScreen() {
  const {
    profile,
    signOut,
    updateEmail,
    updatePhone,
    updateProfile,
  } = useAuth();

  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  async function onSaveProfile() {
    setBusy(true);
    try {
      const result = await updateProfile({
        firstName: firstNameInput,
        lastName: lastNameInput,
        username: usernameInput,
      });
      if (!result.ok) {
        Alert.alert('Profil güncellenemedi', result.reason);
        return;
      }
      setEditingProfile(false);
      Alert.alert('Kaydedildi', 'Ad, soyad ve kullanıcı adı güncellendi.');
    } finally {
      setBusy(false);
    }
  }

  async function onSavePhone() {
    setBusy(true);
    try {
      const result = await updatePhone(phoneInput);
      if (!result.ok) {
        Alert.alert('Telefon güncellenemedi', result.reason);
        return;
      }
      setEditingPhone(false);
      Alert.alert(
        'Telefon güncellendi',
        'SMS doğrulaması henüz yok; ileride eklenecek.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEmail() {
    setBusy(true);
    try {
      const result = await updateEmail(emailInput);
      if (!result.ok) {
        Alert.alert('E-posta değiştirilemedi', result.reason);
        return;
      }
      setEditingEmail(false);
      Alert.alert(
        'Doğrulama gerekli',
        result.message ??
          'Yeni e-postana onay maili gitti. Onaylamadan değişmez.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Hesap</Text>
        <Text style={styles.subtitle}>
          Supabase Auth · e-posta doğrulamalı hesap
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Ad soyad / kullanıcı adı</Text>
          {editingProfile ? (
            <View style={styles.editBlock}>
              <TextInput
                value={firstNameInput}
                onChangeText={setFirstNameInput}
                placeholder="Ad"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                style={styles.input}
              />
              <TextInput
                value={lastNameInput}
                onChangeText={setLastNameInput}
                placeholder="Soyad"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                style={styles.input}
              />
              <TextInput
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="kullanici.adi"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <View style={styles.editActions}>
                <Pressable
                  onPress={() => setEditingProfile(false)}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Vazgeç</Text>
                </Pressable>
                <Pressable
                  onPress={onSaveProfile}
                  disabled={busy}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>
                    {busy ? '...' : 'Kaydet'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.value}>{displayName(profile)}</Text>
              <Text style={styles.valueMuted}>@{profile.username || '—'}</Text>
              <Pressable
                onPress={() => {
                  setFirstNameInput(profile.firstName);
                  setLastNameInput(profile.lastName);
                  setUsernameInput(profile.username);
                  setEditingProfile(true);
                }}
                style={styles.inlineAction}
              >
                <Text style={styles.inlineActionText}>Profili düzenle</Text>
              </Pressable>
            </>
          )}

          <Text style={styles.label}>Rol</Text>
          <Text style={styles.value}>{roleLabel(profile.role)}</Text>

          <Text style={styles.label}>Telefon</Text>
          {editingPhone ? (
            <View style={styles.editBlock}>
              <TextInput
                value={phoneInput}
                onChangeText={setPhoneInput}
                placeholder="05xx xxx xx xx"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <View style={styles.editActions}>
                <Pressable
                  onPress={() => setEditingPhone(false)}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Vazgeç</Text>
                </Pressable>
                <Pressable
                  onPress={onSavePhone}
                  disabled={busy}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>
                    {busy ? '...' : 'Kaydet'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.value}>
                {formatPhoneDisplay(profile.phone)}
              </Text>
              <Pressable
                onPress={() => {
                  setPhoneInput(profile.phone);
                  setEditingPhone(true);
                }}
                style={styles.inlineAction}
              >
                <Text style={styles.inlineActionText}>Telefonu değiştir</Text>
              </Pressable>
            </>
          )}

          <Text style={styles.label}>E-posta</Text>
          {editingEmail ? (
            <View style={styles.editBlock}>
              <TextInput
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="yeni@mail.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
              <View style={styles.editActions}>
                <Pressable
                  onPress={() => setEditingEmail(false)}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Vazgeç</Text>
                </Pressable>
                <Pressable
                  onPress={onSaveEmail}
                  disabled={busy}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>
                    {busy ? '...' : 'Gönder'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.value}>{profile.email}</Text>
              <Pressable
                onPress={() => {
                  setEmailInput(profile.email);
                  setEditingEmail(true);
                }}
                style={styles.inlineAction}
              >
                <Text style={styles.inlineActionText}>E-postayı değiştir</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.note}>
          Eski kayıtlarda kullanıcı adı telefona eşitlenmiş olabilir — buradan
          değiştirebilirsin. 1 telefon = 1 hesap.
        </Text>

        <Pressable
          onPress={() =>
            Alert.alert('Çıkış yap', 'Hesabından çıkmak istiyor musun?', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Çıkış yap',
                style: 'destructive',
                onPress: () => {
                  void signOut();
                },
              },
            ])
          }
          style={styles.logout}
        >
          <Text style={styles.logoutText}>Çıkış yap</Text>
        </Pressable>
      </ScrollView>
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
  valueMuted: {
    marginTop: 2,
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 15,
  },
  editBlock: {
    marginTop: 6,
    gap: 8,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    color: colors.ink,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.courtDeep,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
  },
  inlineAction: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  inlineActionText: {
    fontFamily: fonts.bodyBold,
    color: colors.courtDeep,
    fontSize: 13,
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
