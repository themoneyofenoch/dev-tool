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

async function apiDelete(endpoint) {
  await fetch(`${API}${endpoint}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
}

export default function PasskeySettings() {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const fetchPasskeys = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/auth/passkeys');
      setPasskeys(data.passkeys || []);
    } catch {
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPasskeys(); }, []);

  const handleAdd = async () => {
    setAdding(true);
    setError('');
    try {
      const { options } = await apiPost('/api/auth/passkey/register/begin');
      const attResp = await startRegistration({ optionsJSON: options });
      await apiPost('/api/auth/passkey/register/complete', {
        ...attResp,
        device_name: `${navigator.platform || 'Device'} (${new Date().toLocaleDateString()})`,
      });
      await fetchPasskeys();
    } catch (err) {
      if (err.name === 'ERR_ABORT' || err.message?.includes('cancelled')) return;
      if (err.name === 'InvalidStateError') {
        setError('This passkey was already registered.');
      } else {
        setError(err.message || 'Failed to add passkey');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiDelete(`/api/auth/passkey/${id}`);
      setPasskeys(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to remove passkey');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold">Passkeys</h3>
          <p className="text-xs text-gray-400 mt-0.5">Sign in with Face ID, Touch ID, or fingerprint</p>
        </div>
        <button onClick={handleAdd} disabled={adding} className="btn-primary text-sm">
          {adding ? 'Adding...' : 'Add Passkey'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-6 text-sm text-gray-400">Loading...</div>
      ) : passkeys.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
          <p className="text-sm text-gray-400">No passkeys registered.</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Passkey" to use Face ID or Touch ID.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {passkeys.map(pk => (
            <div key={pk.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{pk.device_name}</p>
                  <p className="text-xs text-gray-400">Added {new Date(pk.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(pk.id)}
                className="text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
