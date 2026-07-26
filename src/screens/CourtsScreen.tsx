import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CourtCard } from '../components/CourtCard';
import { Screen } from '../components/Screen';
import { useBooking } from '../store/BookingContext';
import { colors, fonts, radii, spacing } from '../theme';
import { RootStackParamList } from '../types';

export function CourtsScreen() {
  const insets = useSafeAreaInsets();
  const { courts } = useBooking();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState<string | null>(null);

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
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.brand}>RezKort</Text>
        <Text style={styles.subtitle}>
          Boş saati gör, tek dokunuşla rezerve et.
        </Text>

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
              style={[styles.chipText, !district && styles.chipTextActive]}
            >
              Tümü
            </Text>
          </Pressable>
          {districts.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDistrict(d)}
              style={[styles.chip, district === d && styles.chipActive]}
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

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View style={{ height: spacing.sm }} />
          )}
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
    marginBottom: spacing.md,
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
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
