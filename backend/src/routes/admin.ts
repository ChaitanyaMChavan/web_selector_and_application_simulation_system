import express from 'express';
import { query } from '../config/database';
import { authenticate, authorize } from '../config/auth';
import bcrypt from 'bcryptjs';

const router = express.Router();

// All routes require ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        id,
        email,
        name,
        role,
        created_at,
        updated_at
      FROM projectweb.users
      ORDER BY created_at DESC`
    );

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    return res.json(users);
  } catch (error: any) {
    console.error('Get users error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/admin/users - Create user
router.post('/users', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'all', message: 'Email, password, name, and role are required' }],
      });
    }

    if (!['ADMIN', 'AUTHOR', 'SELECTOR', 'APPLICANT'].includes(role)) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'role', message: 'Invalid role' }],
      });
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM projectweb.users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'User with this email already exists' }],
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO projectweb.users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, hashedPassword, name, role]
    );

    const user = result.rows[0];

    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id - Update user
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, role, password } = req.body;

    // Check if user exists
    const userResult = await query(
      'SELECT id FROM projectweb.users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (email !== undefined) {
      // Check if email is already taken
      const emailCheck = await query(
        'SELECT id FROM projectweb.users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ field: 'email', message: 'Email already in use' }],
        });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (role !== undefined) {
      if (!['ADMIN', 'AUTHOR', 'SELECTOR', 'APPLICANT'].includes(role)) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ field: 'role', message: 'Invalid role' }],
        });
      }
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const result = await query(
      `UPDATE projectweb.users 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, email, name, role, created_at, updated_at`,
      values
    );

    const user = result.rows[0];

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Prevent self-deletion
    if (id === user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Check if user exists
    const userResult = await query(
      'SELECT id FROM projectweb.users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await query('DELETE FROM projectweb.users WHERE id = $1', [id]);

    return res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/admin/stats - System statistics
router.get('/stats', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const [
      usersCount,
      simulationsCount,
      attemptsCount,
      scoredAttemptsCount,
      authorsCount,
      selectorsCount,
      applicantsCount,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM projectweb.users'),
      query('SELECT COUNT(*) as count FROM projectweb.simulations'),
      query('SELECT COUNT(*) as count FROM projectweb.attempts'),
      query("SELECT COUNT(*) as count FROM projectweb.attempts WHERE status = 'SCORED'"),
      query("SELECT COUNT(*) as count FROM projectweb.users WHERE role = 'AUTHOR'"),
      query("SELECT COUNT(*) as count FROM projectweb.users WHERE role = 'SELECTOR'"),
      query("SELECT COUNT(*) as count FROM projectweb.users WHERE role = 'APPLICANT'"),
    ]);

    const stats = {
      users: {
        total: parseInt(usersCount.rows[0].count),
        authors: parseInt(authorsCount.rows[0].count),
        selectors: parseInt(selectorsCount.rows[0].count),
        applicants: parseInt(applicantsCount.rows[0].count),
      },
      simulations: {
        total: parseInt(simulationsCount.rows[0].count),
      },
      attempts: {
        total: parseInt(attemptsCount.rows[0].count),
        scored: parseInt(scoredAttemptsCount.rows[0].count),
      },
    };

    return res.json(stats);
  } catch (error: any) {
    console.error('Get stats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/admin/analytics - Analytics data
router.get('/analytics', async (req, res) => {
  try {
    // Recent attempts (last 30 days)
    const recentAttempts = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM projectweb.attempts
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC`
    );

    // Attempts by status
    const attemptsByStatus = await query(
      `SELECT 
        status,
        COUNT(*) as count
      FROM projectweb.attempts
      GROUP BY status`
    );

    // Average score
    const avgScore = await query(
      `SELECT 
        AVG(score) as avg_score,
        COUNT(*) as count
      FROM projectweb.attempts
      WHERE status = 'SCORED' AND score IS NOT NULL`
    );

    // Simulations by status
    const simulationsByStatus = await query(
      `SELECT 
        status,
        COUNT(*) as count
      FROM projectweb.simulations
      GROUP BY status`
    );

    const analytics = {
      recentAttempts: recentAttempts.rows.map((r) => ({
        date: r.date,
        count: parseInt(r.count),
      })),
      attemptsByStatus: attemptsByStatus.rows.reduce(
        (acc, r) => ({ ...acc, [r.status]: parseInt(r.count) }),
        {} as Record<string, number>
      ),
      averageScore: avgScore.rows[0].avg_score
        ? parseFloat(avgScore.rows[0].avg_score)
        : null,
      scoredAttemptsCount: avgScore.rows[0].count
        ? parseInt(avgScore.rows[0].count)
        : 0,
      simulationsByStatus: simulationsByStatus.rows.reduce(
        (acc, r) => ({ ...acc, [r.status]: parseInt(r.count) }),
        {} as Record<string, number>
      ),
    };

    return res.json(analytics);
  } catch (error: any) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;


