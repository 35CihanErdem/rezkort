import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../store/AuthContext';
import { colors, spacing } from '../../theme';
import { AuthStackParamList } from '../../types';
import { authStyles } from './authStyles';

export function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError('');
    setLoading(true);
    const result = await login({ identifier, password });
    setLoading(false);
    if (!result.ok) setError(result.reason);
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
          <Text style={authStyles.heroTag}>
            İzmir tenis kortlarında yerini ayırt
          </Text>

          <View style={authStyles.panel}>
            <Text style={authStyles.title}>Giriş yap</Text>
            <Text style={authStyles.subtitle}>
              En kolayı: kayıtlı e-posta + şifre. Telefon da olur.
            </Text>

            <Text style={authStyles.label}>E-posta (önerilir) / telefon / kullanıcı adı</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="05xx... veya mail@..."
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
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
              <Text style={authStyles.ctaText}>
                {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
              </Text>
            </Pressable>

            <View style={authStyles.linkRow}>
              <Text style={authStyles.linkMuted}>Hesabın yok mu?</Text>
              <Pressable onPress={() => navigation.navigate('Register')}>
                <Text style={authStyles.link}>Kayıt ol</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
