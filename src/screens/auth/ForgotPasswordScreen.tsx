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
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';
import { AuthStackParamList } from '../../types';
import { authStyles } from './authStyles';

export function ForgotPasswordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError('');
    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      Alert.alert(
        'Mail gönderildi',
        result.message ?? 'Şifre sıfırlama linki e-postanda.',
        [{ text: 'Tamam', onPress: () => navigation.navigate('Login') }],
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen variant="hero">
      <LoadingOverlay visible={loading} label="Mail gönderiliyor..." />
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
          <Text style={authStyles.heroTag}>Şifre sıfırlama</Text>

          <View style={authStyles.panel}>
            <Text style={authStyles.title}>Şifremi unuttum</Text>
            <Text style={authStyles.subtitle}>
              Kayıtlı e-posta adresini yaz. Supabase sıfırlama maili gönderecek.
            </Text>

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

            {error ? <Text style={authStyles.error}>{error}</Text> : null}

            <Pressable
              onPress={onSubmit}
              disabled={loading}
              style={({ pressed }) => [
                authStyles.cta,
                (pressed || loading) && { opacity: 0.88 },
              ]}
            >
              <Text style={authStyles.ctaText}>Sıfırlama linki gönder</Text>
            </Pressable>

            <View style={authStyles.linkRow}>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={authStyles.link}>Girişe dön</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
