import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
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
import { authStyles } from './authStyles';

export function OtpScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { pending, verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pending) navigation.replace('Register');
  }, [pending, navigation]);

  function onVerify() {
    setError('');
    const result = verifyOtp(code);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    navigation.navigate('SetPassword');
  }

  async function onResend() {
    setLoading(true);
    setError('');
    const result = await resendOtp();
    setLoading(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    if (result.demoCode) {
      Alert.alert('Yeni kod', `Doğrulama kodu: ${result.demoCode}`);
    } else {
      Alert.alert('Gönderildi', 'Yeni kod e-postana gönderildi.');
    }
  }

  if (!pending) return null;

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
          <Text style={authStyles.heroTag}>E-posta doğrulama</Text>

          <View style={authStyles.panel}>
            <Text style={authStyles.title}>Kodu gir</Text>
            <Text style={authStyles.subtitle}>
              {pending.email} adresine gelen 6 haneli kodu yaz.
            </Text>

            <Text style={authStyles.label}>Doğrulama kodu</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="******"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              style={authStyles.input}
            />

            {error ? <Text style={authStyles.error}>{error}</Text> : null}

            <Pressable
              onPress={onVerify}
              style={({ pressed }) => [
                authStyles.cta,
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={authStyles.ctaText}>Doğrula</Text>
            </Pressable>

            <View style={authStyles.linkRow}>
              <Text style={authStyles.linkMuted}>Kod gelmedi mi?</Text>
              <Pressable onPress={onResend} disabled={loading}>
                <Text style={authStyles.link}>
                  {loading ? 'Gönderiliyor...' : 'Tekrar gönder'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
