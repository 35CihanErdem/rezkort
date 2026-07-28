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
import { useBooking } from '../store/BookingContext';
import { Screen } from '../components/Screen';
import { colors, fonts, radii, spacing } from '../theme';

export function AdminScreen() {
  const { addCourt, courts } = useBooking();
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [openHour, setOpenHour] = useState('8');
  const [closeHour, setCloseHour] = useState('22');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const open = Number(openHour);
    const close = Number(closeHour);

    if (!name.trim() || !district.trim() || !address.trim()) {
      Alert.alert('Eksik bilgi', 'Ad, semt ve adres gerekli.');
      return;
    }
    if (
      !Number.isInteger(open) ||
      !Number.isInteger(close) ||
      open < 0 ||
      close > 24 ||
      open >= close
    ) {
      Alert.alert('Saat hatası', 'Açılış/kapanış saatlerini kontrol et.');
      return;
    }

    setSaving(true);
    await addCourt({
      name: name.trim(),
      district: district.trim(),
      address: address.trim(),
      openHour: open,
      closeHour: close,
    });
    setSaving(false);

    setName('');
    setDistrict('');
    setAddress('');
    setOpenHour('8');
    setCloseHour('22');
    Alert.alert('Hazır', 'Yeni kort eklendi.');
  }

  return (
    <Screen>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: spacing.md }]}
    >
      <Text style={styles.brand}>Admin</Text>
      <Text style={styles.subtitle}>
        Belediye / tesis yönetimi: yeni tenis kortu ekle.
      </Text>

      <Text style={styles.label}>Kort adı</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Örn. Hasanağa Kort 1"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />

      <Text style={styles.label}>Semt</Text>
      <TextInput
        value={district}
        onChangeText={setDistrict}
        placeholder="Örn. Bornova"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />

      <Text style={styles.label}>Adres</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder="Adres / tesis"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Açılış</Text>
          <TextInput
            value={openHour}
            onChangeText={setOpenHour}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Kapanış</Text>
          <TextInput
            value={closeHour}
            onChangeText={setCloseHour}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>
      </View>

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={({ pressed }) => [
          styles.cta,
          (pressed || saving) && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.ctaText}>
          {saving ? 'Ekleniyor...' : 'Kort oluştur'}
        </Text>
      </Pressable>

      <Text style={styles.section}>Sistemdeki kortlar ({courts.length})</Text>
      {courts.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.cardTitle}>{c.name}</Text>
          <Text style={styles.cardMeta}>
            {c.district} · {c.openHour}:00–{c.closeHour}:00
          </Text>
        </View>
      ))}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 44,
    color: colors.courtDeep,
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
  label: {
    marginBottom: 6,
    marginTop: spacing.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.body,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.courtDeep,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
    fontSize: 16,
  },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  cardMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    color: colors.muted,
  },
});
