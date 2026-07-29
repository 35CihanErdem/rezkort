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
import { getAppVersionLabel } from '../../utils/appVersion';
import { authStyles } from './authStyles';

export function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError('');
    setLoading(true);
    try {
      const result = await signIn({ identifier, password });
      if (!result.ok) setError(result.reason);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen variant="hero">
      <LoadingOverlay visible={loading} label="Giriş yapılıyor..." />
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
          <Text style={authStyles.brand}>REZCOURT</Text>
          <Text style={authStyles.heroTag}>
            İzmir tenis kortlarında yerini ayırt
          </Text>

          <View style={authStyles.panel}>
            <Text style={authStyles.title}>Giriş yap</Text>
            <Text style={authStyles.subtitle}>
              E-posta, telefon veya kullanıcı adı + şifre. E-posta doğrulanmış
              olmalı.
            </Text>

            <Text style={authStyles.label}>E-posta / telefon / kullanıcı adı</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="mail@... veya 05xx..."
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={authStyles.input}
            />

            <Text style={authStyles.label}>Şifre</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Şifren"
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
              <Text style={authStyles.ctaText}>Giriş yap</Text>
            </Pressable>

            <View style={authStyles.linkRow}>
              <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={authStyles.link}>Şifremi Unuttum</Text>
              </Pressable>
            </View>

            <View style={authStyles.linkRow}>
              <Text style={authStyles.linkMuted}>Hesabın yok mu?</Text>
              <Pressable onPress={() => navigation.navigate('Register')}>
                <Text style={authStyles.link}>Kayıt ol</Text>
              </Pressable>
            </View>

            <Text
              style={{
                marginTop: spacing.lg,
                textAlign: 'center',
                color: colors.muted,
                fontSize: 12,
              }}
            >
              {getAppVersionLabel()}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
