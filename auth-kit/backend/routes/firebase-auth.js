import { Router } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRY = '90d';

// ─── Firebase Admin SDK - lazy init, never blocks startup ───
let admin = null;
let fbReady = false;

async function init() {
  if (fbReady) return true;
  if (!admin) {
    try {
      const mod = await import('firebase-admin');
      admin = mod.default || mod;
    } catch (e) {
      console.warn('firebase-admin not available:', e.message);
      return false;
    }
  }
  if (admin.apps.length) { fbReady = true; return true; }

  const initMethods = [
    // Method 1: env var (most reliable)
    () => process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null,
    // Method 2: key file at ~/Developer/private_keys/
    () => {
      try {
        const { readFileSync } = require('fs');
        const { join } = require('path');
        return JSON.parse(readFileSync(join(process.env.HOME || '/home/u885017975', 'private_keys', 'firebase-admin.json'), 'utf-8'));
      } catch { return null; }
    },
    // Method 3: key file in app directory (deployed with code)
    () => {
      try {
        const { readFileSync } = require('fs');
        const { join, dirname } = require('path');
        return JSON.parse(readFileSync(join(dirname(__dirname), 'firebase-key.json'), 'utf-8'));
      } catch { return null; }
    },
  ];

  for (const fn of initMethods) {
    const sa = fn();
    if (sa?.project_id) {
      admin.initializeApp({ credential: admin.credential.cert(sa) });
      fbReady = true;
      console.log('Firebase Admin initialized for:', sa.project_id);
      return true;
    }
  }

  console.warn('Firebase Admin not configured — Google/Apple sign-in disabled');
  return false;
}

const router = Router();

// ─── Implement this to return your database instance ───
function getDb() {
  throw new Error('You must implement getDb() — import your db module');
}

// ─── Implement this to create a business for new sign-ups ───
function createBusinessForUser(db, name) {
  // Override: return { id } for your business table
  return { id: null };
}

// ─── Implement this to seed default data ───
async function seedNewUser(db, userId, businessId) {
  // Override: seed inspections, employees, etc.
}

// POST /api/auth/firebase — exchange Firebase ID token for app JWT
router.post('/auth/firebase', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });

    await init();
    if (!fbReady) return res.status(500).json({ error: 'Firebase Admin not configured' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const db = getDb();

    const firebaseUid = decoded.uid;
    const email = decoded.email || '';
    const name = decoded.name || email.split('@')[0]?.replace(/[^a-zA-Z0-9 ]/g, ' ') || 'User';

    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE firebase_uid = ?').get(firebaseUid);
    
    if (!user && email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (user) {
        db.prepare('UPDATE users SET firebase_uid = ? WHERE id = ?').run(firebaseUid, user.id);
      }
    }

    if (!user) {
      const biz = createBusinessForUser(db, name);
      const result = db.prepare(
        'INSERT INTO users (email, name, password_hash, firebase_uid, business_id) VALUES (?, ?, ?, ?, ?)'
      ).run(email, name, '', firebaseUid, biz.id);
      await seedNewUser(db, result.lastInsertRowid, biz.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    const token = jwt.sign(
      { user_id: user.id, business_id: user.business_id || null, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, business_id: user.business_id, role: user.role },
    });
  } catch (err) {
    console.error('Firebase auth error:', err.code, err.message);
    // Decode token for debugging
    try {
      const parts = err.code ? [] : (req.body.idToken || '').split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        console.error('Token aud:', payload.aud, 'iss:', payload.iss, 'sub:', payload.sub?.slice(0, 20));
      }
    } catch (_) {}
    const msg = err.code === 'auth/id-token-expired' ? 'Token expired'
      : err.code === 'auth/argument-error' ? 'Invalid token format'
      : err.message || 'Invalid Firebase token';
    res.status(401).json({ error: msg });
  }
});

// GET /api/auth/firebase/config — expose Firebase config for frontend
router.get('/auth/firebase/config', (req, res) => {
  res.json({
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
  });
});

export default router;
