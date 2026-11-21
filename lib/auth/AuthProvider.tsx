// App-wide authentication context backed by Supabase.
// Copied from barcode-scanner (email/password only: Google, Apple, account
// deletion and the email-link deep link are left out; snapbike has no scheme).
//
// Exposes the current session plus sign-in / sign-up / sign-out helpers. On
// mount it reads any persisted session from storage (so a previously logged-in
// user is restored without re-login) and subscribes to auth state changes.
// `loading` is true until that first read resolves, letting the app show a
// splash instead of flashing the login screen.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

// Read by BikeOffice's /admin to tell app signups from web signups.
const SIGNUP_SOURCE = { signup_source: 'app' };

// Test user for automatic sign-in in development builds. Leave unset in release builds.
const TEST_EMAIL = process.env.EXPO_PUBLIC_TEST_EMAIL ?? '';
const TEST_PW = process.env.EXPO_PUBLIC_TEST_PW ?? '';

type AuthResult = { error: string | null };

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  // `unconfirmed` is true when the password was right but the address was never
  // confirmed, so the caller can offer the code step instead of a dead end.
  signIn: (email: string, password: string) => Promise<AuthResult & { unconfirmed: boolean }>;
  // `alreadyExists` is true when the address is already registered. Supabase
  // hides that behind a fake success to prevent user enumeration, so it has to
  // be read out of the response rather than an error (see signUp below).
  signUp: (
    email: string,
    password: string
  ) => Promise<AuthResult & { needsConfirmation: boolean; alreadyExists: boolean }>;
  // The code from the confirmation mail. A correct code signs the user in.
  verifySignupCode: (email: string, code: string) => Promise<AuthResult>;
  resendSignupCode: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Restore a persisted session (if any) for the initial render.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session && __DEV__ && TEST_EMAIL && TEST_PW) {
        // Dev-only auto sign-in with the test user while testing.
        const { data: signedIn } = await supabase.auth.signInWithPassword({
          email: TEST_EMAIL,
          password: TEST_PW,
        });
        if (!active) return;
        setSession(signedIn.session);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    });

    // Keep state in sync with sign-in / sign-out / token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    // Supabase only auto-refreshes tokens while the app is in the foreground;
    // start/stop the timer with the app's active state.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult & { unconfirmed: boolean }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error?.message ?? null, unconfirmed: error?.code === 'email_not_confirmed' };
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string
    ): Promise<AuthResult & { needsConfirmation: boolean; alreadyExists: boolean }> => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: SIGNUP_SOURCE },
      });
      // Registering an address that already has an account is not an error:
      // with "prevent user enumeration" on (the default), Supabase answers 200
      // with an obfuscated user and an *empty* identities array, and sends no
      // mail. Telling those users to "check your email to confirm" leaves them
      // waiting for a message that never arrives, so detect the case and let
      // the caller send them to sign-in instead.
      const alreadyExists = !error && !data.session && data.user?.identities?.length === 0;
      // When email confirmation is on, a genuine sign-up returns a user but no
      // session until the link is tapped.
      const needsConfirmation = !error && !data.session && !alreadyExists;
      return { error: error?.message ?? null, needsConfirmation, alreadyExists };
    },
    []
  );

  // Confirming with the code keeps the whole sign-up inside the app; the link
  // opens a browser first and only comes back if the deep link is honoured.
  const verifySignupCode = useCallback(async (email: string, code: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'signup',
    });
    return { error: error?.message ?? null };
  }, []);

  const resendSignupCode = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    // No redirectTo: the link opens the project's Site URL (BikeOffice web).
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn,
      signUp,
      verifySignupCode,
      resendSignupCode,
      signOut,
      resetPassword,
    }),
    [
      session,
      loading,
      signIn,
      signUp,
      verifySignupCode,
      resendSignupCode,
      signOut,
      resetPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
