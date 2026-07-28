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
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BookingProvider, useBooking } from './src/store/BookingContext';
import { colors } from './src/theme';

function AppReady() {
  const { loading: authLoading } = useAuth();
  const { ready: bookingReady } = useBooking();

  if (authLoading || !bookingReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.court} />
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
        <ActivityIndicator size="large" color={colors.court} />
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
  },
});
