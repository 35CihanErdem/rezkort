import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { BookingProvider, useBooking } from './src/store/BookingContext';
import { colors } from './src/theme';

function AppReady() {
  const { ready: authReady } = useAuth();
  const { ready: bookingReady } = useBooking();

  if (!authReady || !bookingReady) {
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
