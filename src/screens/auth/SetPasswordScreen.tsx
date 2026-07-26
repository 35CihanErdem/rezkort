import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
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
import { formatPhoneDisplay } from '../../utils/phone';
import { authStyles } from './authStyles';

export function SetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { pending, completeRegister } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pending?.emailVerified) {
      navigation.replace(pending ? 'Otp' : 'Register');
    } else if (pending && !username) {
      setUsername(pending.phone);
    }
  }, [pending, navigation, username]);

  async function onSubmit() {
    setError('');
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    const result = await completeRegister({ username, password });
    setLoading(false);
    if (!result.ok) setError(result.reason);
  }

  if (!pending?.emailVerified) return null;

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
          <Text style={authStyles.heroTag}>Son adım</Text>

          <View style={authStyles.panel}>
            <Text style={authStyles.title}>Şifre belirle</Text>
            <Text style={authStyles.subtitle}>
              {pending.email} → {formatPhoneDisplay(pending.phone)} bağlanacak.
            </Text>

            <Text style={authStyles.label}>Kullanıcı adı</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="ornek.oyuncu"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
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
                {loading ? 'Hesap oluşturuluyor...' : 'Hesabı oluştur'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
