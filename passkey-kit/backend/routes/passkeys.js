import { Router } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ─── CONFIG — customize these per app ───
const APP_NAME = 'My App';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-random-string';
const JWT_EXPIRY = '90d';

// ─── Challenge store (in-memory, single server) ───
// For multi-server: use a DB table with TTL
const challengeStore = new Map();

// Cleans up expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of challengeStore) {
    if (val._expiresAt && val._expiresAt < now) challengeStore.delete(key);
  }
}, 300000);

function getRpConfig(req) {
  const origin = req.headers.origin || `http://localhost:5173`;
  const host = req.headers.host || 'localhost:5173';
  const rpID = host.includes('localhost') ? 'localhost' : host.split(':')[0];
  return { rpID, origin, rpName: APP_NAME };
}

// ─── Helpers ───
function getDb() {
  // Import your DB getter here
  // e.g. import getDb from '../db.js';
  throw new Error('You must implement getDb() — see the DB import at the top of routes/passkeys.js');
}

const router = Router();

// ═══════════════════════════════════════════════
//  PASSKEY-FIRST REGISTRATION (no auth required)
// ═══════════════════════════════════════════════

// POST /api/auth/passkey/register/begin/noauth
router.post('/auth/passkey/register/begin/noauth', async (req, res) => {
  try {
    const db = getDb();
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered. Sign in instead.' });
    }

    const { rpID, origin, rpName } = getRpConfig(req);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: isoUint8Array.fromUTF8String(email),
      userName: email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const sessionId = crypto.randomUUID();
    challengeStore.set(`noreg:${sessionId}`, {
      challenge: options.challenge,
      expectedRPID: rpID,
      expectedOrigin: origin,
      name,
      email,
      _expiresAt: Date.now() + 300000, // 5 min
    });

    res.json({ options, session_id: sessionId });
  } catch (err) {
    console.error('Passkey register begin error:', err);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

// POST /api/auth/passkey/register/complete/noauth
router.post('/auth/passkey/register/complete/noauth', async (req, res) => {
  try {
    const db = getDb();
    const { session_id } = req.body;
    const stored = challengeStore.get(`noreg:${session_id}`);
    if (!stored) {
      return res.status(400).json({ error: 'Registration session expired. Try again.' });
    }

    const { rpID, origin } = getRpConfig(req);
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: stored.challenge,
      expectedOrigin: stored.expectedOrigin,
      expectedRPID: stored.expectedRPID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      challengeStore.delete(`noreg:${session_id}`);
      return res.status(400).json({ error: 'Passkey verification failed' });
    }

    const dup = db.prepare('SELECT id FROM users WHERE email = ?').get(stored.email);
    if (dup) {
      challengeStore.delete(`noreg:${session_id}`);
      return res.status(409).json({ error: 'Email already registered' });
    }

    // ─── Create user (customize for your user model) ───
    const password_hash = await bcrypt.hash(crypto.randomUUID(), 10);
    const userResult = db.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).run(stored.email, password_hash, stored.name);
    const userId = userResult.lastInsertRowid;

    // ─── Store credential ───
    // v13: credential.id is Base64URLString, credential.publicKey is Uint8Array
    const { credential } = verification.registrationInfo;
    db.prepare(
      `INSERT INTO passkeys (user_id, credential_id, public_key, counter, transports, device_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      credential.id,
      credential.publicKey,
      credential.counter,
      JSON.stringify(req.body.response?.transports || []),
      `${req.headers['user-agent']?.slice(0, 40) || 'Device'} (passkey)`,
    );

    const token = jwt.sign(
      { user_id: userId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);

    challengeStore.delete(`noreg:${session_id}`);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Passkey register complete error:', err);
    res.status(500).json({ error: 'Failed to complete passkey registration' });
  }
});

// ═══════════════════════════════════════════════
//  PASSKEY LOGIN (no auth required)
// ═══════════════════════════════════════════════

// POST /api/auth/passkey/login/begin
router.post('/auth/passkey/login/begin', async (req, res) => {
  try {
    const db = getDb();
    const { rpID, origin } = getRpConfig(req);

    const allPasskeys = db.prepare('SELECT credential_id FROM passkeys').all();
    const allowCredentials = allPasskeys.map(p => ({
      id: p.credential_id,
      type: 'public-key',
      transports: ['internal', 'hybrid', 'ble', 'nfc', 'usb'],
    }));

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const sessionId = crypto.randomUUID();
    challengeStore.set(`login:${sessionId}`, {
      challenge: options.challenge,
      expectedRPID: rpID,
      expectedOrigin: origin,
      _expiresAt: Date.now() + 300000,
    });

    res.json({ options, session_id: sessionId });
  } catch (err) {
    console.error('Passkey login begin error:', err);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

// POST /api/auth/passkey/login/complete
router.post('/auth/passkey/login/complete', async (req, res) => {
  try {
    const db = getDb();
    const { session_id } = req.body;
    const stored = challengeStore.get(`login:${session_id}`);
    if (!stored) {
      return res.status(400).json({ error: 'Login session expired. Try again.' });
    }

    const { rpID, origin } = getRpConfig(req);
    const credentialId = req.body.id;
    const saved = db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').get(credentialId);

    if (!saved) {
      challengeStore.delete(`login:${session_id}`);
      return res.status(404).json({ error: 'Passkey not found on server' });
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: stored.challenge,
      expectedOrigin: stored.expectedOrigin,
      expectedRPID: stored.expectedRPID,
      credential: {
        id: saved.credential_id,
        publicKey: saved.public_key,
        counter: saved.counter,
        transports: saved.transports ? JSON.parse(saved.transports) : [],
      },
    });

    challengeStore.delete(`login:${session_id}`);

    if (!verification.verified) {
      return res.status(400).json({ error: 'Passkey authentication failed' });
    }

    db.prepare('UPDATE passkeys SET counter = ? WHERE id = ?').run(verification.authenticationInfo.newCounter, saved.id);

    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(saved.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = jwt.sign(
      { user_id: user.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ token, user });
  } catch (err) {
    console.error('Passkey login complete error:', err);
    res.status(500).json({ error: 'Failed to verify passkey authentication' });
  }
});

// ═══════════════════════════════════════════════
//  AUTH-REQUIRED ENDPOINTS (manage passkeys)
// ═══════════════════════════════════════════════

// Add passkey to an existing user — requires auth
// Import your authMiddleware and use it here
/*
router.post('/auth/passkey/register/begin', authMiddleware, async (req, res) => { ... });
router.post('/auth/passkey/register/complete', authMiddleware, async (req, res) => { ... });
*/

// GET /api/auth/passkeys
router.get('/auth/passkeys', /* authMiddleware, */ async (req, res) => {
  try {
    const db = getDb();
    const userId = req.userId; // Set by your auth middleware
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const keys = db.prepare(
      'SELECT id, device_name, created_at FROM passkeys WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
    res.json({ passkeys: keys });
  } catch (err) {
    console.error('List passkeys error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/passkey/:id
router.delete('/auth/passkey/:id', /* authMiddleware, */ async (req, res) => {
  try {
    const db = getDb();
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM passkeys WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) return res.status(404).json({ error: 'Passkey not found' });

    db.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete passkey error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
