import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TennisLoader } from '../components/TennisLoader';
import { useAuth } from '../context/AuthContext';
import { AUTH_REDIRECT_SCHEME } from '../lib/supabase';
import { AccountScreen } from '../screens/AccountScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { CourtDetailScreen } from '../screens/CourtDetailScreen';
import { CourtsScreen } from '../screens/CourtsScreen';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { colors, fonts } from '../theme';
import {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from '../types';
import { canAccessAdmin } from '../utils/roles';

const Tab = createBottomTabNavigator<MainTabParamList>();
const AppStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 16, opacity: focused ? 1 : 0.45 }}>{label}</Text>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const tabBottom = Math.max(insets.bottom, 8);
  const showAdmin = canAccessAdmin(profile);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.courtDeep,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 54 + tabBottom,
          paddingBottom: tabBottom,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="Courts"
        component={CourtsScreen}
        options={{
          title: 'Kortlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="🎾" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{
          title: 'Randevular',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="📅" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Hesap',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="👤" focused={focused} />
          ),
        }}
      />
      {showAdmin ? (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            title: 'Admin',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="⚙️" focused={focused} />
            ),
          }}
        />
      ) : null}
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  const { passwordRecovery } = useAuth();

  return (
    <AuthStack.Navigator
      key={passwordRecovery ? 'recovery' : 'auth'}
      screenOptions={{ headerShown: false }}
      initialRouteName={passwordRecovery ? 'ResetPassword' : 'Login'}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="CourtDetail"
        component={CourtDetailScreen}
        options={{
          title: 'Rezervasyon',
          headerTintColor: colors.courtDeep,
          headerTitleStyle: { fontFamily: fonts.bodyBold },
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </AppStack.Navigator>
  );
}

const linking = {
  prefixes: [Linking.createURL('/'), `${AUTH_REDIRECT_SCHEME}://`],
};

export function RootNavigator() {
  const { loading, profile, session, passwordRecovery } = useAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <TennisLoader label="Kort hazırlanıyor..." size="lg" />
      </View>
    );
  }

  const isAuthed = Boolean(session && profile) && !passwordRecovery;

  return (
    <NavigationContainer linking={linking}>
      {isAuthed ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
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
