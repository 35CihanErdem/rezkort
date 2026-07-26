import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../store/AuthContext';
import { colors, spacing } from '../../theme';
import { AuthStackParamList } from '../../types';
import { normalizeEmail } from '../../utils/email';
import { authStyles } from './authStyles';

export function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { startRegister } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError('');
    setLoading(true);
    const result = await startRegister({ firstName, lastName, phone, email });
    setLoading(false);

    if (!result.ok) {
      setError(result.reason);
      return;
    }

    if (result.demoCode) {
      Alert.alert(
        'E-posta simülasyonu',
        `${normalizeEmail(email)} adresine kod:\n\n${result.demoCode}`,
      );
    } else {
      Alert.alert(
        'Kod gönderildi',
        `${normalizeEmail(email)} adresine doğrulama kodu gönderildi.`,
      );
    }

    navigation.navigate('Otp');
  }

  return (
    <Screen variant="hero">
      <KeyboardAvoidingView
        style={authStyles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            authStyles.content,
            { paddingTop: insets.top + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={authStyles.brand}>RezKort</Text>
          <Text style={authStyles.heroTag}>Hesap oluştur, kortunu kilitle</Text>

          <View style={authStyles.panel}>
            <Text style={authStyles.title}>Kayıt ol</Text>
            <Text style={authStyles.subtitle}>
              Ana kimlik telefon: 1 numara = 1 hesap. E-posta doğrulama için.
            </Text>

            <Text style={authStyles.label}>Ad</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Adın"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              style={authStyles.input}
            />

            <Text style={authStyles.label}>Soyad</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Soyadın"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              style={authStyles.input}
            />

            <Text style={authStyles.label}>Telefon (ana kimlik)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="05xx xxx xx xx"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              style={authStyles.input}
            />

            <Text style={authStyles.label}>E-posta (doğrulama)</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={authStyles.input}
            />

            {error ? <Text style={authStyles.error}>{error}</Text> : null}

            <Pressable
              onPress={onSubmit}
              disabled={loading}
              style={({ pressed }) => [
                authStyles.cta,
                (pressed || loading) && { opacity: 0.88 },
              ]}
            >
              <Text style={authStyles.ctaText}>
                {loading ? 'Kod gönderiliyor...' : 'E-posta kodu gönder'}
              </Text>
            </Pressable>

            <View style={authStyles.linkRow}>
              <Text style={authStyles.linkMuted}>Zaten hesabın var mı?</Text>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={authStyles.link}>Giriş yap</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
