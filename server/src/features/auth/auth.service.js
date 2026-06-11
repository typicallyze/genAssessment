import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db.js';
import config from '../../config/env.js';

export async function register({ email, password, name, role }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    const err = new Error('Email already registered');
    err.type = 'conflict';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
    [email, passwordHash, name, role || 'student']
  );
  return result.rows[0];
}

export async function login({ email, password }) {
  const result = await query('SELECT id, email, password_hash, name, role FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    const err = new Error('Invalid email or password');
    err.type = 'validation';
    throw err;
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const err = new Error('Invalid email or password');
    err.type = 'validation';
    throw err;
  }

  const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function getProfile(userId) {
  const result = await query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    const err = new Error('User not found');
    err.type = 'not_found';
    throw err;
  }
  return result.rows[0];
}
