import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CourtCard } from '../components/CourtCard';
import { CourtsMap } from '../components/CourtsMap';
import { Screen } from '../components/Screen';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useBooking } from '../store/BookingContext';
import { colors, fonts, radii, spacing } from '../theme';
import { RootStackParamList } from '../types';
import { getAppVersionLabel } from '../utils/appVersion';

export function CourtsScreen() {
  const { courts, refreshAll } = useBooking();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { refreshControlProps } = usePullToRefresh(refreshAll);

  const districts = useMemo(
    () => Array.from(new Set(courts.map((c) => c.district))).sort(),
    [courts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courts.filter((c) => {
      const matchDistrict = !district || c.district === district;
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q);
      return matchDistrict && matchQuery;
    });
  }, [courts, district, query]);

  return (
    <Screen>
      <View style={[styles.screen, { paddingTop: spacing.md }]}>
        <Text style={styles.brand}>REZCOURT</Text>
        <Text style={styles.subtitle}>
          Boş saati gör, tek dokunuşla rezerve et.
        </Text>
        <Text style={styles.version}>{getAppVersionLabel()}</Text>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setViewMode('list')}
            style={[styles.modeChip, viewMode === 'list' && styles.modeChipOn]}
          >
            <Text
              style={[
                styles.modeText,
                viewMode === 'list' && styles.modeTextOn,
              ]}
            >
              Liste
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('map')}
            style={[styles.modeChip, viewMode === 'map' && styles.modeChipOn]}
          >
            <Text
              style={[
                styles.modeText,
                viewMode === 'map' && styles.modeTextOn,
              ]}
            >
              Harita
            </Text>
          </Pressable>
        </View>

        {viewMode === 'map' ? (
          <View style={styles.mapMode}>
            <CourtsMap courts={filtered} fill />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl {...refreshControlProps} />}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => (
              <View style={{ height: spacing.sm }} />
            )}
            ListHeaderComponent={
              <View>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Kort veya semt ara..."
                  placeholderTextColor={colors.muted}
                  style={styles.search}
                />
                <View style={styles.filters}>
                  <Pressable
                    onPress={() => setDistrict(null)}
                    style={[styles.chip, !district && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        !district && styles.chipTextActive,
                      ]}
                    >
                      Tümü
                    </Text>
                  </Pressable>
                  {districts.map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setDistrict(d)}
                      style={[
                        styles.chip,
                        district === d && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          district === d && styles.chipTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>Bu filtreye uygun kort yok.</Text>
            }
            renderItem={({ item }) => (
              <CourtCard
                court={item}
                onPress={() =>
                  navigation.navigate('CourtDetail', { courtId: item.id })
                }
              />
            )}
          />
        )}
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
    fontSize: 48,
    color: colors.courtDeep,
    letterSpacing: 1,
    lineHeight: 50,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: spacing.sm,
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  version: {
    marginBottom: spacing.md,
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 12,
  },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.body,
    marginBottom: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  modeChip: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeChipOn: {
    backgroundColor: colors.courtDeep,
    borderColor: colors.courtDeep,
  },
  modeText: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
  },
  modeTextOn: {
    color: colors.white,
  },
  mapMode: {
    flex: 1,
    marginBottom: spacing.md,
    minHeight: 280,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
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
  list: {
    paddingBottom: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.muted,
    marginTop: spacing.xl,
  },
});
