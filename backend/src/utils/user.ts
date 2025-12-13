import { query } from '../config/database';

export async function getUserById(userId: string) {
  const result = await query(
    'SELECT id, email, name, role, created_at FROM projectweb.users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function getUserByEmail(email: string) {
  const result = await query(
    'SELECT id, email, name, role, password_hash, created_at FROM projectweb.users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

