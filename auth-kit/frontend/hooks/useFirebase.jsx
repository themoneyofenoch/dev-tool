import { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
} from 'firebase/auth';

let firebaseApp = null;
let auth = null;
let initPromise = null;

// ─── Firebase config — fetch from backend or fallback to env vars ───
async function getConfig() {
  try {
    const res = await fetch('/api/auth/firebase/config');
    if (res.ok) {
      const data = await res.json();
      if (data.apiKey) return data;
    }
  } catch { /* fallback */ }
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

// ─── Eager init — call once, returns cached result ───
async function ensureFirebase() {
  if (auth) return auth;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const config = await getConfig();
    if (!config.apiKey) throw new Error('Firebase not configured');
    firebaseApp = initializeApp(config, 'auth-kit');
    auth = getAuth(firebaseApp);
    return auth;
  })();
  return initPromise;
}

// ─── Exchange Firebase ID token for app JWT ───
async function exchangeToken(idToken) {
  const res = await fetch('/api/auth/firebase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to sign in');
  }
  return res.json();
}

// ─── Hook — use in login page ───
export function useFirebase() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let mounted = true;
    ensureFirebase().then(async (a) => {
      // Handle redirect result (user returning from Google/Apple redirect)
      if (!mounted) return;
      try {
        const result = await getRedirectResult(a);
        if (result) {
          setRedirecting(true);
          const idToken = await result.user.getIdToken(true);
          const data = await exchangeToken(idToken);
          localStorage.setItem('token', data.token);
          window.location.href = '/';
          return;
        }
      } catch (err) {
        if (err.code !== 'auth/no-auth-event') {
          console.error('[Firebase] Redirect result error:', err.code, err.message);
          setError(err.message || 'Sign in failed');
        }
      }
      if (mounted) { setReady(true); setBusy(false); }
    }).catch(err => {
      console.error('[Firebase] Init error:', err);
      if (mounted) setBusy(false);
    });
    return () => { mounted = false; };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // ─── OAuth sign-in — popup first, redirect fallback ───
  function doOAuth(providerType) {
    if (!auth || !ready) { setError('Not ready yet, try again'); return; }
    setError(null);
    setBusy(true);

    const provider = providerType === 'google'
      ? (() => { const p = new GoogleAuthProvider(); p.addScope('email'); p.addScope('profile'); return p; })()
      : (() => { const p = new OAuthProvider('apple.com'); p.addScope('email'); p.addScope('name'); return p; })();

    // Try popup first (synchronous — no await before popup preserves gesture)
    signInWithPopup(auth, provider)
      .then(async (result) => {
        const idToken = await result.user.getIdToken(true);
        const data = await exchangeToken(idToken);
        localStorage.setItem('token', data.token);
        window.location.href = '/';
      })
      .catch((err) => {
        if (err.code === 'auth/popup-closed-by-user') { setBusy(false); return; }
        if (err.code === 'auth/popup-blocked') {
          // Fallback to redirect — page will navigate to Google/Apple and back
          console.log('[Firebase] Popup blocked, falling back to redirect');
          signInWithRedirect(auth, provider).catch(e => {
            console.error('[Firebase] Redirect failed:', e);
            setError('Sign in failed. Try email/password instead.');
            setBusy(false);
          });
          return;
        }
        console.error('[Firebase]', providerType, 'error:', err.code, err.message);
        setError(err.message || 'Sign in failed');
        setBusy(false);
      });
  }

  const signInGoogle = useCallback(() => doOAuth('google'), [ready]);
  const signInApple = useCallback(() => doOAuth('apple'), [ready]);

  const signInEmail = useCallback(async (email, password) => {
    setError(null); setBusy(true);
    try {
      await ensureFirebase();
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken(true);
      const data = await exchangeToken(idToken);
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    } catch (err) {
      setError(err.code === 'auth/wrong-password' ? 'Wrong password'
        : err.code === 'auth/user-not-found' ? 'No account found'
        : err.message || 'Sign in failed');
    } finally { setBusy(false); }
  }, []);

  const signUpEmail = useCallback(async (email, password) => {
    setError(null); setBusy(true);
    try {
      await ensureFirebase();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken(true);
      const data = await exchangeToken(idToken);
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? 'Email already registered'
        : err.code === 'auth/weak-password' ? 'Password must be 6+ characters'
        : err.message || 'Sign up failed');
    } finally { setBusy(false); }
  }, []);

  const resetPassword = useCallback(async (email) => {
    setError(null); setBusy(true);
    try {
      await ensureFirebase();
      await sendPasswordResetEmail(auth, email);
      setError('Reset email sent! Check your inbox.');
    } catch (err) {
      setError(err.message || 'Reset failed');
    } finally { setBusy(false); }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('token');
    if (auth) await signOut(auth).catch(() => {});
    window.location.href = '/login';
  }, []);

  return {
    ready, busy, error, clearError, redirecting,
    signInGoogle, signInApple,
    signInEmail, signUpEmail,
    resetPassword, logout,
  };
}

/*
  ─── Redirect fallback setup (for apps where popup is always blocked) ───

  When signInWithRedirect is used, the browser navigates to Google/Apple
  and returns to your app. For this to work on custom domains:

  1. In your Express server, proxy auth helper requests:
     app.all('/__/auth/:path*', async (req, res) => {
       const target = 'https://YOUR_PROJECT.firebaseapp.com/__/auth/' + req.params.path;
       const resp = await fetch(target, { method: req.method, headers: req.headers });
       res.status(resp.status).set(resp.headers).send(await resp.text());
     });

  2. In your Firebase config, set authDomain to your app's domain:
     authDomain: "alf.nakfaai.com" (NOT firebaseapp.com)

  3. In Google Cloud Console → Credentials → OAuth 2.0 Client IDs:
     Add: https://alf.nakfaai.com/__/auth/handler

  4. For Apple Service ID → Return URL:
     https://alf.nakfaai.com/__/auth/handler

  The popup-first approach handles most cases. Redirect is only used
  as a fallback when the browser blocks popups (Safari/iOS, strict settings).
*/
