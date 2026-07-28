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
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';
import { AuthStackParamList } from '../../types';
import { authStyles } from './authStyles';

export function RegisterScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError('');
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({
        firstName,
        lastName,
        phone,
        email,
        password,
      });
      if (!result.ok) {
        setError(result.reason);
        return;
      }

      Alert.alert(
        'E-postanı doğrula',
        result.message ??
          'Doğrulama linki gönderildi. Onayladıktan sonra giriş yap.',
        [{ text: 'Girişe dön', onPress: () => navigation.navigate('Login') }],
      );
    } finally {
      setLoading(false);
    }
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
            { paddingTop: spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={authStyles.brand}>RezKort</Text>
          <Text style={authStyles.heroTag}>Hesap oluştur, kortunu kilitle</Text>

          <View style={authStyles.panel}>
            <Text style={authStyles.title}>Kayıt ol</Text>
            <Text style={authStyles.subtitle}>
              1 telefon = 1 hesap. E-posta doğrulaması zorunlu (Supabase Auth).
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

            <Text style={authStyles.label}>Telefon</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="05xx xxx xx xx"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              style={authStyles.input}
            />

            <Text style={authStyles.label}>E-posta</Text>
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

            <Text style={authStyles.label}>Şifre</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="En az 6 karakter"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={authStyles.input}
            />

            <Text style={authStyles.label}>Şifre tekrar</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Şifreni tekrar yaz"
              placeholderTextColor={colors.muted}
              secureTextEntry
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
                {loading ? 'Hesap oluşturuluyor...' : 'Kayıt ol'}
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
