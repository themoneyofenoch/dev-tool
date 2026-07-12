import { useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

const API = '';

async function apiPost(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function PasskeyLogin({ onLogin }) {
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setPasskeyLoading(true);
    setError('');
    try {
      const { options, session_id } = await apiPost('/api/auth/passkey/login/begin');
      const authResp = await startAuthentication({ optionsJSON: options });
      const data = await apiPost('/api/auth/passkey/login/complete', { ...authResp, session_id });
      if (data.token) {
        localStorage.setItem('token', data.token);
        onLogin?.(data);
      }
    } catch (err) {
      if (err.name === 'ERR_ABORT' || err.message?.includes('cancelled')) return;
      setError(err.message || 'Passkey sign in failed');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setRegBusy(true);
    try {
      const { options, session_id } = await apiPost('/api/auth/passkey/register/begin/noauth', {
        name: regName,
        email: regEmail,
      });
      const attResp = await startRegistration({ optionsJSON: options });
      const data = await apiPost('/api/auth/passkey/register/complete/noauth', {
        ...attResp,
        session_id,
      });
      if (data.token) {
        localStorage.setItem('token', data.token);
        onLogin?.(data);
      }
    } catch (err) {
      if (err.name === 'ERR_ABORT' || err.message?.includes('cancelled')) return;
      setError(err.message || 'Passkey account creation failed');
    } finally {
      setRegBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600">{error}</div>
      )}

      <button
        type="button"
        onClick={handleSignIn}
        disabled={passkeyLoading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        {passkeyLoading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        )}
        {passkeyLoading ? 'Checking passkey...' : 'Sign in with Face ID'}
      </button>

      {!showReg ? (
        <button
          type="button"
          onClick={() => setShowReg(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create account with Face ID
        </button>
      ) : (
        <form onSubmit={handleRegister} className="space-y-2.5 pt-1">
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            placeholder="Your name"
            value={regName}
            onChange={e => setRegName(e.target.value)}
            required
          />
          <input
            type="email"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            placeholder="you@example.com"
            value={regEmail}
            onChange={e => setRegEmail(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={regBusy}
              className="flex-1 text-sm font-semibold py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {regBusy ? 'Creating...' : 'Continue with Face ID'}
            </button>
            <button
              type="button"
              onClick={() => { setShowReg(false); setError(''); }}
              className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
