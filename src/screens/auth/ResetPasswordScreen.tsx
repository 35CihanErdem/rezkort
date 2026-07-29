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

export function ResetPasswordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { updatePassword, signOut, clearPasswordRecovery } = useAuth();
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
      const result = await updatePassword(password);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      clearPasswordRecovery();
      await signOut();
      Alert.alert('Şifre güncellendi', 'Yeni şifrenle giriş yap.', [
        { text: 'Tamam', onPress: () => navigation.navigate('Login') },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen variant="hero">
      <LoadingOverlay visible={loading} label="Şifre kaydediliyor..." />
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
          <Text style={authStyles.heroTag}>Yeni şifre</Text>

          <View style={authStyles.panel}>
            <Text style={authStyles.title}>Şifreni yenile</Text>
            <Text style={authStyles.subtitle}>
              Maildeki linkten geldiysen yeni şifreni belirle.
            </Text>

            <Text style={authStyles.label}>Yeni şifre</Text>
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
              <Text style={authStyles.ctaText}>Şifreyi kaydet</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
