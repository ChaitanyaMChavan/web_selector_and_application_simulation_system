import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { generateToken, authenticate } from '../config/auth';
import { getUserById } from '../utils/user';
import { signupValidation, loginValidation } from '../middleware/validation';

const router = express.Router();

// Simple in-memory lockout tracking (per email)
const loginAttempts: Record<
  string,
  { count: number; firstAttempt: number; lockedUntil?: number }
> = {};
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

// POST /api/auth/signup/applicant
router.post('/signup/applicant', signupValidation, async (req: express.Request, res: express.Response) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM projectweb.users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO projectweb.users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'APPLICANT')
       RETURNING id, email, name, role, created_at`,
      [name, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: 'APPLICANT',
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/',
    });

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/login/:role
router.post('/login/:role', loginValidation, async (req: express.Request, res: express.Response) => {
  try {
    const role = req.params.role.toLowerCase();
    const validRoles = ['admin', 'author', 'selector', 'applicant'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const { email, password } = req.body;

    const key = email.toLowerCase();
    const now = Date.now();
    const attemptInfo = loginAttempts[key];
    if (attemptInfo?.lockedUntil && now < attemptInfo.lockedUntil) {
      return res.status(429).json({
        message: 'Account locked due to repeated failures. Please try again later.',
      });
    }

    // Get user from database
    const result = await query(
      'SELECT id, email, name, role, password_hash, created_at FROM projectweb.users WHERE email = $1 AND role = $2',
      [email, role.toUpperCase()]
    );

    if (result.rows.length === 0) {
      // Track failed attempt
      loginAttempts[key] = attemptInfo && now - attemptInfo.firstAttempt < WINDOW_MS
        ? { count: attemptInfo.count + 1, firstAttempt: attemptInfo.firstAttempt }
        : { count: 1, firstAttempt: now };
      if (loginAttempts[key].count >= MAX_ATTEMPTS) {
        loginAttempts[key].lockedUntil = now + LOCK_MS;
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      loginAttempts[key] = attemptInfo && now - attemptInfo.firstAttempt < WINDOW_MS
        ? { count: (attemptInfo.count || 0) + 1, firstAttempt: attemptInfo.firstAttempt }
        : { count: 1, firstAttempt: now };
      if (loginAttempts[key].count >= MAX_ATTEMPTS) {
        loginAttempts[key].lockedUntil = now + LOCK_MS;
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Successful login clears attempts
    delete loginAttempts[key];

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/',
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    const user = await getUserById(userPayload.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
});

export default router;

