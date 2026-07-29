import {
  BebasNeue_400Regular,
  useFonts as useBebas,
} from '@expo-google-fonts/bebas-neue';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDmSans,
} from '@expo-google-fonts/dm-sans';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TennisLoader } from './src/components/TennisLoader';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BookingProvider, useBooking } from './src/store/BookingContext';
import { colors, fonts, radii, spacing } from './src/theme';

function AppReady() {
  const { loading: authLoading } = useAuth();
  const { ready: bookingReady, bootError, refreshAll } = useBooking();
  const [retrying, setRetrying] = useState(false);

  if (authLoading || (!bookingReady && !bootError)) {
    return (
      <View style={styles.boot}>
        <TennisLoader label="Kortlar yükleniyor..." size="lg" />
      </View>
    );
  }

  if (bootError) {
    return (
      <View style={styles.boot}>
        <Text style={styles.errorTitle}>Bir şeyler ters gitti</Text>
        <Text style={styles.errorBody}>{bootError}</Text>
        <Pressable
          disabled={retrying}
          onPress={async () => {
            setRetrying(true);
            try {
              await refreshAll();
            } catch {
              // bootError refreshAll içinde set edilir
            } finally {
              setRetrying(false);
            }
          }}
          style={({ pressed }) => [
            styles.retryBtn,
            (pressed || retrying) && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.retryText}>
            {retrying ? 'Tekrar deneniyor...' : 'Tekrar dene'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <RootNavigator />
      <StatusBar style="dark" />
    </>
  );
}

export default function App() {
  const [bebasLoaded] = useBebas({ BebasNeue_400Regular });
  const [dmLoaded] = useDmSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  if (!bebasLoaded || !dmLoaded) {
    return (
      <View style={styles.boot}>
        <TennisLoader label="REZCOURT açılıyor..." size="lg" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BookingProvider>
          <AppReady />
        </BookingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.courtDeep,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.courtDeep,
    borderRadius: radii.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
    fontSize: 15,
  },
});
