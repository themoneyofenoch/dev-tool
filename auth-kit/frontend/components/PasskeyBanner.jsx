import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';

const API = '';

async function apiGet(endpoint) {
  const res = await fetch(`${API}${endpoint}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  return res.json();
}

async function apiPost(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function PasskeyBanner() {
  const [visible, setVisible] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('passkey_prompt_dismissed')) return;
    apiGet('/api/auth/passkeys').then(data => {
      if (!data.passkeys?.length) setVisible(true);
    }).catch(() => {});
  }, []);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const { options } = await apiPost('/api/auth/passkey/register/begin');
      const attResp = await startRegistration({ optionsJSON: options });
      await apiPost('/api/auth/passkey/register/complete', {
        ...attResp,
        device_name: `${navigator.platform || 'Device'} (${new Date().toLocaleDateString()})`,
      });
      setVisible(false);
    } catch (err) {
      if (err.name === 'ERR_ABORT' || err.message?.includes('cancelled')) return;
      console.error('Passkey setup failed:', err);
    } finally {
      setAdding(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="bg-blue-600 px-4 lg:px-5 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
        <p className="text-sm font-medium text-white truncate">
          Set up Face ID — next time sign in without a password
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleAdd}
          disabled={adding}
          className="text-sm font-semibold bg-white text-blue-600 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {adding ? 'Setting up...' : 'Set Up Face ID'}
        </button>
        <button
          onClick={() => { setVisible(false); localStorage.setItem('passkey_prompt_dismissed', 'true'); }}
          className="p-1.5 text-white/70 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
