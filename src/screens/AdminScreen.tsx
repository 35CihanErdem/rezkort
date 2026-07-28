import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { TennisLoader } from '../components/TennisLoader';
import { useAuth } from '../context/AuthContext';
import * as adminService from '../services/admin.service';
import { useBooking } from '../store/BookingContext';
import { colors, fonts, radii, spacing } from '../theme';
import type {
  AdminCourt,
  AdminUser,
  Facility,
  Municipality,
  ReservationRules,
} from '../types/admin';
import type { ProfileRole } from '../types/profile';
import { canAccessAdmin, isGlobalAdmin, roleLabel } from '../utils/roles';
import { formatPhoneDisplay } from '../utils/phone';

type Tab = 'facilities' | 'courts' | 'users' | 'rules';

const ROLE_CYCLE: ProfileRole[] = [
  'citizen',
  'staff',
  'admin',
  'super_admin',
];

export function AdminScreen() {
  const { profile } = useAuth();
  const { refreshCourts } = useBooking();

  const [tab, setTab] = useState<Tab>('courts');
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [adminCourts, setAdminCourts] = useState<AdminCourt[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rules, setRules] = useState<ReservationRules[]>([]);
  const [municipalityId, setMunicipalityId] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [facilityName, setFacilityName] = useState('');
  const [facilityDistrict, setFacilityDistrict] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');

  const [courtName, setCourtName] = useState('');
  const [openHour, setOpenHour] = useState('8');
  const [closeHour, setCloseHour] = useState('22');
  const [hasLights, setHasLights] = useState(false);

  const [lateJoinInput, setLateJoinInput] = useState('30');

  const allowed = canAccessAdmin(profile);
  const canManageUsers = profile?.role === 'super_admin';
  const canEditRules = isGlobalAdmin(profile) || profile?.role === 'super_admin';

  const filteredFacilities = useMemo(
    () =>
      municipalityId
        ? facilities.filter((f) => f.municipalityId === municipalityId)
        : facilities,
    [facilities, municipalityId],
  );

  const filteredCourts = useMemo(
    () =>
      facilityId
        ? adminCourts.filter((c) => c.facilityId === facilityId)
        : adminCourts,
    [adminCourts, facilityId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tasks: Promise<unknown>[] = [
        adminService.listMunicipalities(),
        adminService.listFacilities(),
        adminService.listAdminCourts(),
        adminService.listReservationRules(),
      ];
      if (canManageUsers) {
        tasks.push(adminService.listUsers());
      }
      const [m, f, c, r, u] = await Promise.all(tasks);
      setMunicipalities(m as Municipality[]);
      setFacilities(f as Facility[]);
      setAdminCourts(c as AdminCourt[]);
      const nextRules = (r as ReservationRules[]) ?? [];
      setRules(nextRules);
      if (canManageUsers) {
        setUsers((u as AdminUser[]) ?? []);
      }
      setMunicipalityId((prev) => {
        const next = prev ?? (m as Municipality[])[0]?.id ?? null;
        const rule = nextRules.find((x) => x.municipalityId === next);
        if (rule) {
          setLateJoinInput(String(rule.lateJoinMinutes));
        }
        return next;
      });
      setFacilityId((prev) => prev ?? (f as Facility[])[0]?.id ?? null);
    } catch (e) {
      Alert.alert(
        'Yüklenemedi',
        e instanceof Error ? e.message : 'Admin verisi alınamadı.',
      );
    } finally {
      setLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  async function onCreateFacility() {
    if (!municipalityId) {
      Alert.alert('Belediye seç', 'Önce belediye seç.');
      return;
    }
    setSaving(true);
    try {
      const result = await adminService.createFacility({
        municipalityId,
        name: facilityName,
        district: facilityDistrict,
        address: facilityAddress,
      });
      if (!result.ok) {
        Alert.alert('Tesis eklenemedi', result.reason);
        return;
      }
      setFacilityName('');
      setFacilityDistrict('');
      setFacilityAddress('');
      await load();
      Alert.alert('Hazır', result.message ?? 'Tesis eklendi.');
    } finally {
      setSaving(false);
    }
  }

  async function onCreateCourt() {
    if (!facilityId) {
      Alert.alert('Tesis seç', 'Önce tesis seç.');
      return;
    }
    setSaving(true);
    try {
      const result = await adminService.createCourt({
        facilityId,
        name: courtName,
        hasLights,
        openHour: Number(openHour),
        closeHour: Number(closeHour),
      });
      if (!result.ok) {
        Alert.alert('Kort eklenemedi', result.reason);
        return;
      }
      setCourtName('');
      setOpenHour('8');
      setCloseHour('22');
      setHasLights(false);
      await load();
      await refreshCourts();
      Alert.alert('Hazır', result.message ?? 'Kort eklendi.');
    } finally {
      setSaving(false);
    }
  }

  async function onToggleStatus(court: AdminCourt) {
    const next =
      court.status === 'active'
        ? 'maintenance'
        : court.status === 'maintenance'
          ? 'inactive'
          : 'active';
    const result = await adminService.updateCourtStatus(court.id, next);
    if (!result.ok) {
      Alert.alert('Güncellenemedi', result.reason);
      return;
    }
    await load();
    await refreshCourts();
  }

  async function onCycleUserRole(user: AdminUser) {
    if (!canManageUsers) return;
    if (user.id === profile?.id) {
      Alert.alert('Dur', 'Kendi rolünü buradan değiştiremezsin.');
      return;
    }
    const idx = ROLE_CYCLE.indexOf(user.role);
    const next = ROLE_CYCLE[(idx + 1) % ROLE_CYCLE.length];
    const result = await adminService.updateUserRole(user.id, next);
    if (!result.ok) {
      Alert.alert('Rol güncellenemedi', result.reason);
      return;
    }
    await load();
  }

  async function onSaveRules() {
    if (!municipalityId) {
      Alert.alert('Belediye seç', 'Önce belediye seç.');
      return;
    }
    setSaving(true);
    try {
      const result = await adminService.updateReservationRules(municipalityId, {
        lateJoinMinutes: Number(lateJoinInput),
      });
      if (!result.ok) {
        Alert.alert('Kaydedilemedi', result.reason);
        return;
      }
      await load();
      await refreshCourts();
      Alert.alert('Kaydedildi', `Geç giriş toleransı: ${lateJoinInput} dk`);
    } finally {
      setSaving(false);
    }
  }

  function selectMunicipality(id: string) {
    setMunicipalityId(id);
    const first = facilities.find((f) => f.municipalityId === id);
    setFacilityId(first?.id ?? null);
    const rule = rules.find((x) => x.municipalityId === id);
    if (rule) {
      setLateJoinInput(String(rule.lateJoinMinutes));
    }
  }

  if (!allowed) {
    return (
      <Screen>
        <View style={[styles.screen, styles.denied]}>
          <Text style={styles.brand}>Admin</Text>
          <Text style={styles.deniedText}>
            Bu alana sadece personel / admin girebilir.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Admin</Text>
        <Text style={styles.subtitle}>
          {roleLabel(profile!.role)}
          {isGlobalAdmin(profile) ? ' · tüm belediyeler' : ' · atandığın tesisler'}
        </Text>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('courts')}
            style={[styles.tab, tab === 'courts' && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, tab === 'courts' && styles.tabTextActive]}
            >
              Kortlar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('facilities')}
            style={[styles.tab, tab === 'facilities' && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'facilities' && styles.tabTextActive,
              ]}
            >
              Tesisler
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('rules')}
            style={[styles.tab, tab === 'rules' && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, tab === 'rules' && styles.tabTextActive]}
            >
              Kurallar
            </Text>
          </Pressable>
          {canManageUsers ? (
            <Pressable
              onPress={() => setTab('users')}
              style={[styles.tab, tab === 'users' && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === 'users' && styles.tabTextActive,
                ]}
              >
                Kullanıcılar
              </Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <TennisLoader label="Admin yükleniyor..." />
          </View>
        ) : tab === 'rules' ? (
          <>
            <Text style={styles.section}>Belediye</Text>
            <View style={styles.chipRow}>
              {municipalities.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => selectMunicipality(m.id)}
                  style={[
                    styles.chip,
                    municipalityId === m.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      municipalityId === m.id && styles.chipTextActive,
                    ]}
                  >
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>Geç giriş toleransı</Text>
            <Text style={styles.muted}>
              Örn. 20:00–21:00 + 30 dk → 20:30’a kadar alınır, 20:31’de alınmaz.
              Bitiş yine 21:00.
            </Text>
            <Text style={styles.label}>Tolerans (dk)</Text>
            <TextInput
              value={lateJoinInput}
              onChangeText={setLateJoinInput}
              keyboardType="number-pad"
              editable={canEditRules}
              style={styles.input}
            />
            {canEditRules ? (
              <Pressable
                onPress={onSaveRules}
                disabled={saving}
                style={({ pressed }) => [
                  styles.cta,
                  (pressed || saving) && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.ctaText}>
                  {saving ? 'Kaydediliyor...' : 'Kuralları kaydet'}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.muted}>
                Kuralları sadece admin / süper admin değiştirebilir.
              </Text>
            )}

            {rules.length === 0 ? (
              <Text style={[styles.muted, { marginTop: spacing.md }]}>
                Bu belediye için kural satırı yok. Seed/migration çalıştır.
              </Text>
            ) : null}
          </>
        ) : tab === 'users' && canManageUsers ? (
          <>
            <Text style={styles.section}>
              Kullanıcılar ({users.length})
            </Text>
            <Text style={styles.muted}>
              Role dokununca sırayla değişir: vatandaş → personel → admin →
              süper admin.
            </Text>
            {users.map((u) => (
              <View key={u.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {u.firstName} {u.lastName}
                </Text>
                <Text style={styles.cardMeta}>
                  @{u.username || '—'} · {formatPhoneDisplay(u.phone)}
                </Text>
                <Text style={styles.cardMeta}>{u.email}</Text>
                <Text style={styles.status}>
                  {roleLabel(u.role)}
                  {!u.isActive ? ' · pasif' : ''}
                </Text>
                <Pressable
                  onPress={() => onCycleUserRole(u)}
                  style={styles.statusBtn}
                >
                  <Text style={styles.statusBtnText}>Rolü değiştir</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : tab === 'facilities' ? (
          <>
            <Text style={styles.section}>Belediye</Text>
            <View style={styles.chipRow}>
              {municipalities.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => selectMunicipality(m.id)}
                  style={[
                    styles.chip,
                    municipalityId === m.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      municipalityId === m.id && styles.chipTextActive,
                    ]}
                  >
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>Yeni tesis</Text>
            <Text style={styles.label}>Tesis adı</Text>
            <TextInput
              value={facilityName}
              onChangeText={setFacilityName}
              placeholder="Örn. Bostanlı Tenis Tesisleri"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Text style={styles.label}>Semt</Text>
            <TextInput
              value={facilityDistrict}
              onChangeText={setFacilityDistrict}
              placeholder="Örn. Karşıyaka"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Text style={styles.label}>Adres</Text>
            <TextInput
              value={facilityAddress}
              onChangeText={setFacilityAddress}
              placeholder="Adres"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Pressable
              onPress={onCreateFacility}
              disabled={saving}
              style={({ pressed }) => [
                styles.cta,
                (pressed || saving) && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.ctaText}>
                {saving ? 'Kaydediliyor...' : 'Tesis ekle'}
              </Text>
            </Pressable>

            <Text style={styles.section}>
              Tesisler ({filteredFacilities.length})
            </Text>
            {filteredFacilities.map((f) => (
              <View key={f.id} style={styles.card}>
                <Text style={styles.cardTitle}>{f.name}</Text>
                <Text style={styles.cardMeta}>
                  {f.district} · {f.address}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.section}>Tesis seç</Text>
            <View style={styles.chipRow}>
              {facilities.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => setFacilityId(f.id)}
                  style={[
                    styles.chip,
                    facilityId === f.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      facilityId === f.id && styles.chipTextActive,
                    ]}
                  >
                    {f.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>Yeni kort</Text>
            <Text style={styles.label}>Kort adı</Text>
            <TextInput
              value={courtName}
              onChangeText={setCourtName}
              placeholder="Örn. Kort 1"
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
              onPress={() => setHasLights((v) => !v)}
              style={[styles.toggle, hasLights && styles.toggleOn]}
            >
              <Text
                style={[styles.toggleText, hasLights && styles.toggleTextOn]}
              >
                {hasLights ? 'Aydınlatma: Var' : 'Aydınlatma: Yok'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onCreateCourt}
              disabled={saving}
              style={({ pressed }) => [
                styles.cta,
                (pressed || saving) && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.ctaText}>
                {saving ? 'Kaydediliyor...' : 'Kort ekle'}
              </Text>
            </Pressable>

            <Text style={styles.section}>
              Kortlar ({filteredCourts.length})
            </Text>
            {filteredCourts.map((c) => (
              <View key={c.id} style={styles.card}>
                <Text style={styles.cardTitle}>{c.name}</Text>
                <Text style={styles.cardMeta}>
                  {c.facilityName ?? 'Tesis'} · {c.district ?? '—'} ·{' '}
                  {c.openHour}:00–{c.closeHour}:00
                </Text>
                <Text style={styles.status}>Durum: {c.status}</Text>
                <Pressable
                  onPress={() => onToggleStatus(c)}
                  style={styles.statusBtn}
                >
                  <Text style={styles.statusBtnText}>Durumu değiştir</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
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
  denied: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  deniedText: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 22,
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
    lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.courtDeep,
    borderColor: colors.courtDeep,
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.courtDeep,
    borderColor: colors.courtDeep,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.white,
  },
  toggle: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: colors.available,
    borderColor: '#B7E0C8',
  },
  toggleText: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
  },
  toggleTextOn: {
    color: colors.courtDeep,
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
  status: {
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
    color: colors.court,
    fontSize: 13,
  },
  statusBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusBtnText: {
    fontFamily: fonts.bodyBold,
    color: colors.courtDeep,
    fontSize: 12,
  },
  muted: {
    fontFamily: fonts.body,
    color: colors.muted,
  },
  loaderWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
