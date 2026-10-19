import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/services/api';
import { login, register } from '@/services/auth-service';
import { persistSession } from '@/components/redux-provider';
import { setSession } from '@/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

type AuthScreenProps = {
  mode: 'login' | 'register';
};

export function AuthScreen({ mode }: AuthScreenProps) {
  const dispatch = useAppDispatch();
  const { isRestoring, session } = useAppSelector((state) => state.auth);
  const isLogin = mode === 'login';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!isRestoring && session) {
      router.replace('/');
    }
  }, [isRestoring, session]);

  async function handleSubmit() {
    setFeedback('');
    const cleanUsername = username.trim();
    if (!cleanUsername || !password || cleanUsername.length > 100 || password.length > 256) {
      setFeedback('Informe um usuário e uma senha válidos.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        const authenticatedSession = await login({ username: cleanUsername, password });
        await persistSession(authenticatedSession);
        dispatch(setSession(authenticatedSession));
        router.replace('/');
      } else {
        await register({ username: cleanUsername, password });
        router.replace('/login');
      }
    } catch (error) {
      setFeedback(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Não foi possível concluir. Tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Text style={styles.brandLetter}>E</Text></View>
            <Text style={styles.brandName}>evolift</Text>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>SUA ROTINA. SEU RITMO.</Text>
            <Text style={styles.heroTitle}>
              O próximo nível começa <Text style={styles.heroAccent}>por você.</Text>
            </Text>
            <Text style={styles.heroDescription}>
              {isLogin
                ? 'Entre para acompanhar sua jornada e manter o foco no que importa.'
                : 'Crie sua conta e dê o primeiro passo na sua jornada de evolução.'}
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formKicker}>{isLogin ? 'BOM TER VOCÊ DE VOLTA' : 'COMECE SUA JORNADA'}</Text>
            <Text style={styles.formTitle}>{isLogin ? 'Acesse sua conta' : 'Crie sua conta'}</Text>
            <Text style={styles.formSubtitle}>
              {isLogin
                ? 'Entre com seus dados para continuar sua evolução.'
                : 'Escolha seus dados de acesso para começar.'}
            </Text>

            <Text style={styles.label}>Usuário</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="username"
              maxLength={100}
              onChangeText={setUsername}
              placeholder="Digite seu usuário"
              placeholderTextColor="#89928a"
              returnKeyType="next"
              style={styles.input}
              value={username}
            />

            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordRow}>
              <TextInput
                autoCapitalize="none"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                maxLength={256}
                onChangeText={setPassword}
                onSubmitEditing={handleSubmit}
                placeholder="Digite sua senha"
                placeholderTextColor="#89928a"
                returnKeyType="done"
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
                value={password}
              />
              <Pressable
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                accessibilityRole="button"
                onPress={() => setShowPassword((visible) => !visible)}
                style={styles.showPasswordButton}
              >
                <Text style={styles.showPassword}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
              </Pressable>
            </View>

            {feedback ? <Text accessibilityRole="alert" style={styles.feedback}>{feedback}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={({ pressed }) => [styles.submit, pressed && styles.pressed, isSubmitting && styles.disabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#17251b" />
              ) : (
                <Text style={styles.submitText}>{isLogin ? 'Entrar na minha conta' : 'Criar minha conta'}  ↗</Text>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {isLogin ? 'Ainda não tem uma conta? ' : 'Já tem uma conta? '}
              </Text>
              <Link href={isLogin ? '/register' : '/login'} style={styles.switchLink}>
                {isLogin ? 'Cadastre-se' : 'Fazer login'}
              </Link>
            </View>

            <Text style={styles.privacy}>Seus dados são protegidos e usados apenas para acessar sua conta.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f2' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 8 },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#b9fa6a', alignItems: 'center', justifyContent: 'center' },
  brandLetter: { fontSize: 21, fontWeight: '900', color: '#17311e' },
  brandName: { color: '#183523', fontSize: 22, fontWeight: '800', letterSpacing: -1 },
  hero: { paddingTop: 36, paddingBottom: 28 },
  eyebrow: { color: '#527546', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  heroTitle: { color: '#183523', fontSize: 36, lineHeight: 40, fontWeight: '800', letterSpacing: -1.5, marginTop: 12 },
  heroAccent: { color: '#659a3c' },
  heroDescription: { color: '#68766a', fontSize: 15, lineHeight: 23, marginTop: 13, maxWidth: 330 },
  formCard: { backgroundColor: '#fff', borderRadius: 22, padding: 22, borderWidth: 1, borderColor: '#e8ede5' },
  formKicker: { color: '#668c4a', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  formTitle: { color: '#213528', fontSize: 25, fontWeight: '800', marginTop: 8 },
  formSubtitle: { color: '#7a847b', fontSize: 13, lineHeight: 20, marginTop: 6, marginBottom: 24 },
  label: { color: '#334338', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: { height: 52, borderWidth: 1, borderColor: '#dfe6dc', borderRadius: 12, paddingHorizontal: 14, color: '#203327', fontSize: 15, backgroundColor: '#fbfcfa', marginBottom: 18 },
  passwordRow: { position: 'relative', marginBottom: 18 },
  passwordInput: { width: '100%', paddingRight: 84, marginBottom: 0 },
  showPasswordButton: {
    position: 'absolute',
    top: 0,
    right: 8,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 8,
    zIndex: 1,
  },
  showPassword: { color: '#5e8e42', fontWeight: '700', fontSize: 12 },
  feedback: { color: '#b53e36', fontSize: 13, lineHeight: 19, marginTop: -4, marginBottom: 14 },
  submit: { height: 54, borderRadius: 13, backgroundColor: '#b9fa6a', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  submitText: { color: '#1d3422', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 22 },
  switchText: { color: '#737e74', fontSize: 13 },
  switchLink: { color: '#527d39', fontSize: 13, fontWeight: '800' },
  privacy: { color: '#929b93', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 24 },
});
