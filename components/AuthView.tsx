// Login / registration screen, copied from barcode-scanner. Email/password
// only; Swedish copy is inlined instead of the i18n module, and the toast is a
// plain notice line.
//
// Registering an address that already has an account is not treated as an
// error: Supabase hides that case behind a fake success (see AuthProvider's
// signUp), so we detect it, switch the screen to sign-in and sign in with the
// credentials already typed.
//
// A genuine sign-up moves to a third mode, 'verify', where the user types the
// code from the confirmation mail. Signing in with an unconfirmed address lands
// on the same step.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth/AuthProvider';
import { styles } from './AuthView.styles';

const t = {
  auth: {
    loginTitle: 'Logga in',
    registerTitle: 'Skapa konto',
    loginSubtitle: 'Logga in med ditt BikeOffice-konto',
    registerSubtitle: 'Registrera dig för att komma igång',
    emailLabel: 'E-post',
    emailPlaceholder: 'din@epost.se',
    passwordLabel: 'Lösenord',
    passwordPlaceholder: 'Minst 6 tecken',
    loginButton: 'Logga in',
    registerButton: 'Skapa konto',
    switchToRegister: 'Har du inget konto? Registrera dig',
    switchToLogin: 'Har du redan ett konto? Logga in',
    missingFields: 'Fyll i e-post och lösenord.',
    passwordTooShort: 'Lösenordet måste vara minst 6 tecken.',
    confirmEmailTitle: 'Bekräfta din e-post',
    codeSubtitle: (email: string) =>
      `Vi har skickat en kod till ${email}. Skriv in den här så är du klar – du behöver inte lämna appen.`,
    codeLabel: 'Kod från mejlet',
    codeButton: 'Bekräfta',
    codeResend: 'Skicka koden igen',
    codeResent: (email: string) => `Ny kod skickad till ${email}.`,
    codeBack: 'Tillbaka',
    codeMissing: 'Skriv in koden från mejlet.',
    codeInvalid: 'Koden stämmer inte. Kontrollera mejlet, eller skicka en ny kod.',
    genericError: 'Något gick fel. Försök igen.',
    forgotPassword: 'Glömt lösenord?',
    resetEmailNeeded: 'Fyll i din e-postadress först.',
    resetEmailSentMessage:
      'Om det finns ett konto för den här adressen har vi skickat en länk för att återställa lösenordet.',
    accountExistsMessage:
      'Det finns redan ett konto för den här e-postadressen – logga in med ditt lösenord.',
  },
};

type Mode = 'login' | 'register' | 'verify';

type Props = {
  // Dismiss the prompt (login is optional now). Omitted when shown as a full
  // screen with no escape.
  onClose?: () => void;
};

export function AuthView({ onClose }: Props) {
  const { signIn, signUp, verifySignupCode, resendSignupCode, resetPassword } = useAuth();
  // Staff sign in with their existing BikeOffice account, so start on sign-in.
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isRegister = mode === 'register';
  const isVerify = mode === 'verify';

  const anyBusy = busy;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async () => {
    if (anyBusy) return;
    setError(null);

    if (!email.trim() || !password) {
      setError(t.auth.missingFields);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.passwordTooShort);
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        const { error: err, needsConfirmation, alreadyExists } = await signUp(email, password);
        if (err) {
          setError(err);
          return;
        }
        if (alreadyExists) {
          // The address is taken, so "register" was almost certainly meant as
          // "sign in" — try exactly that with the credentials already typed.
          // Nothing extra is revealed: a wrong password lands on the same
          // "invalid credentials" the sign-in form would have shown anyway.
          switchMode('login');
          const { error: signInErr } = await signIn(email, password);
          if (signInErr) setNotice(t.auth.accountExistsMessage);
          // Otherwise a session exists; AuthProvider closes the prompt.
          return;
        }
        if (needsConfirmation) {
          setCode('');
          switchMode('verify');
        }
        // Otherwise a session was created; AuthProvider closes the prompt.
      } else {
        const { error: err, unconfirmed } = await signIn(email, password);
        if (unconfirmed) {
          // The account exists but was never confirmed; its code (or a resent
          // one) finishes the job right here.
          setCode('');
          switchMode('verify');
        } else if (err) {
          setError(err);
        }
      }
    } catch {
      setError(t.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (anyBusy) return;
    setError(null);
    if (!code) {
      setError(t.auth.codeMissing);
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await verifySignupCode(email, code);
      if (err) setError(t.auth.codeInvalid);
      // Otherwise a session exists; AuthProvider closes the prompt.
    } catch {
      setError(t.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const handleResendCode = async () => {
    if (anyBusy) return;
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await resendSignupCode(email);
      if (err) {
        setError(err);
        return;
      }
      setCode('');
      setNotice(t.auth.codeResent(email.trim()));
    } catch {
      setError(t.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (anyBusy) return;
    setError(null);

    if (!email.trim()) {
      setError(t.auth.resetEmailNeeded);
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await resetPassword(email);
      if (err) {
        setError(err);
        return;
      }
      setNotice(t.auth.resetEmailSentMessage);
    } catch {
      setError(t.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Android runs edge-to-edge and this screen lives in a Modal, so the
          window is never resized for the keyboard: pad on both platforms. The
          form scrolls, so a short screen or large text can still reach the
          buttons with the keyboard up. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {/* Top bar in normal flow, not absolutely positioned: the links wrap
            onto a second line on a narrow screen or with large text instead
            of running into each other or under the close button. */}
        <View style={styles.header}>
          <View style={styles.topLinks}>
            {isVerify ? (
              // Back to the form, e.g. to fix a mistyped address.
              <TouchableOpacity onPress={() => switchMode('register')} disabled={anyBusy}>
                <Text style={styles.linkText}>{t.auth.codeBack}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={() => switchMode(isRegister ? 'login' : 'register')} disabled={anyBusy}>
                  <Text style={styles.linkText}>
                    {isRegister ? t.auth.switchToLogin : t.auth.switchToRegister}
                  </Text>
                </TouchableOpacity>
                {!isRegister && (
                  <TouchableOpacity onPress={handleForgotPassword} disabled={anyBusy}>
                    <Text style={styles.linkText}>{t.auth.forgotPassword}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          {onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={10} disabled={anyBusy}>
              <Ionicons name="close" size={26} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {isVerify ? (
            <>
              <Text style={styles.title}>{t.auth.confirmEmailTitle}</Text>
              <Text style={styles.subtitle}>{t.auth.codeSubtitle(email.trim())}</Text>

              <Text style={styles.label}>{t.auth.codeLabel}</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
                placeholder="123456"
                placeholderTextColor="#9aa0a6"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                editable={!anyBusy}
                onSubmitEditing={handleVerify}
                returnKeyType="go"
              />

              {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={styles.notice}>{notice}</Text>}
              {notice && <Text style={styles.notice}>{notice}</Text>}

              <TouchableOpacity
                style={[styles.button, anyBusy && styles.buttonDisabled]}
                onPress={handleVerify}
                activeOpacity={0.8}
                disabled={anyBusy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t.auth.codeButton}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn} onPress={handleResendCode} disabled={anyBusy}>
                <Text style={styles.linkText}>{t.auth.codeResend}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
          <Text style={styles.title}>{isRegister ? t.auth.registerTitle : t.auth.loginTitle}</Text>
          <Text style={styles.subtitle}>
            {isRegister ? t.auth.registerSubtitle : t.auth.loginSubtitle}
          </Text>

          <Text style={styles.label}>{t.auth.emailLabel}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t.auth.emailPlaceholder}
            placeholderTextColor="#9aa0a6"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!anyBusy}
          />

          <Text style={styles.label}>{t.auth.passwordLabel}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t.auth.passwordPlaceholder}
            placeholderTextColor="#9aa0a6"
            secureTextEntry
            autoCapitalize="none"
            textContentType={isRegister ? 'newPassword' : 'password'}
            editable={!anyBusy}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={styles.notice}>{notice}</Text>}

          <TouchableOpacity
            style={[styles.button, anyBusy && styles.buttonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={anyBusy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegister ? t.auth.registerButton : t.auth.loginButton}
              </Text>
            )}
          </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
