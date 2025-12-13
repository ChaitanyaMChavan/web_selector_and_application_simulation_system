import express from 'express';
import { query } from '../config/database';
import { authenticate, authorize } from '../config/auth';

const router = express.Router();

// GET /api/attempts/simulation/:simulationId/current - Get current attempt
router.get('/simulation/:simulationId/current', authenticate, authorize('APPLICANT'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { simulationId } = req.params;

    const result = await query(
      `SELECT 
        a.id,
        a.simulation_id,
        a.applicant_id,
        a.status,
        a.started_at,
        a.submitted_at
      FROM projectweb.attempts a
      WHERE a.simulation_id = $1 
        AND a.applicant_id = $2 
        AND a.status = 'IN_PROGRESS'
      ORDER BY a.started_at DESC
      LIMIT 1`,
      [simulationId, user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No active attempt found' });
    }

    const attempt = result.rows[0];

    // Get responses
    const responsesResult = await query(
      'SELECT step_id, answer FROM projectweb.responses WHERE attempt_id = $1',
      [attempt.id]
    );

    return res.json({
      id: attempt.id,
      simulationId: attempt.simulation_id,
      applicantId: attempt.applicant_id,
      status: attempt.status,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      responses: responsesResult.rows.map(r => ({
        stepId: r.step_id,
        answer: r.answer,
      })),
    });
  } catch (error: any) {
    console.error('Get current attempt error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/attempts/simulation/:simulationId/start - Start new attempt
router.post('/simulation/:simulationId/start', authenticate, authorize('APPLICANT'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { simulationId } = req.params;

    // Check if simulation exists and is published
    const simResult = await query(
      'SELECT id, status FROM projectweb.simulations WHERE id = $1',
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      return res.status(404).json({ message: 'Simulation not found' });
    }

    if (simResult.rows[0].status !== 'PUBLISHED') {
      return res.status(400).json({ message: 'Simulation is not published' });
    }

    // Check if there's already an active attempt
    const existingAttempt = await query(
      `SELECT id FROM projectweb.attempts 
       WHERE simulation_id = $1 
         AND applicant_id = $2 
         AND status = 'IN_PROGRESS'`,
      [simulationId, user.userId]
    );

    if (existingAttempt.rows.length > 0) {
      return res.status(400).json({
        message: 'You already have an active attempt for this simulation',
      });
    }

    // Create new attempt
    const result = await query(
      `INSERT INTO projectweb.attempts (simulation_id, applicant_id, status)
       VALUES ($1, $2, 'IN_PROGRESS')
       RETURNING id, simulation_id, applicant_id, status, started_at, submitted_at`,
      [simulationId, user.userId]
    );

    const attempt = result.rows[0];

    return res.status(201).json({
      id: attempt.id,
      simulationId: attempt.simulation_id,
      applicantId: attempt.applicant_id,
      status: attempt.status,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      responses: [],
    });
  } catch (error: any) {
    console.error('Start attempt error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/attempts/:attemptId/response - Save/update response
router.post('/:attemptId/response', authenticate, authorize('APPLICANT'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { attemptId } = req.params;
    const { stepId, answer } = req.body;

    if (!stepId || !answer) {
      return res.status(400).json({ message: 'stepId and answer are required' });
    }

    // Verify attempt ownership and status
    const attemptResult = await query(
      'SELECT applicant_id, status FROM projectweb.attempts WHERE id = $1',
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const attempt = attemptResult.rows[0];

    if (attempt.applicant_id !== user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Attempt is not in progress' });
    }

    // Upsert response (insert or update)
    const result = await query(
      `INSERT INTO projectweb.responses (attempt_id, step_id, answer)
       VALUES ($1, $2, $3)
       ON CONFLICT (attempt_id, step_id)
       DO UPDATE SET answer = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING id, attempt_id, step_id, answer, created_at, updated_at`,
      [attemptId, stepId, answer]
    );

    const response = result.rows[0];

    return res.json({
      id: response.id,
      attemptId: response.attempt_id,
      stepId: response.step_id,
      answer: response.answer,
      createdAt: response.created_at,
      updatedAt: response.updated_at,
    });
  } catch (error: any) {
    console.error('Save response error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/attempts/:attemptId/submit - Submit attempt
router.post('/:attemptId/submit', authenticate, authorize('APPLICANT'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { attemptId } = req.params;

    // Verify attempt ownership and status
    const attemptResult = await query(
      'SELECT applicant_id, status FROM projectweb.attempts WHERE id = $1',
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const attempt = attemptResult.rows[0];

    if (attempt.applicant_id !== user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (attempt.status === 'SUBMITTED' || attempt.status === 'SCORED') {
      return res.status(400).json({ message: 'Attempt has already been submitted' });
    }

    // Update attempt status
    const result = await query(
      `UPDATE projectweb.attempts 
       SET status = 'SUBMITTED', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, simulation_id, applicant_id, status, started_at, submitted_at`,
      [attemptId]
    );

    const updatedAttempt = result.rows[0];

    return res.json({
      id: updatedAttempt.id,
      simulationId: updatedAttempt.simulation_id,
      applicantId: updatedAttempt.applicant_id,
      status: updatedAttempt.status,
      startedAt: updatedAttempt.started_at,
      submittedAt: updatedAttempt.submitted_at,
    });
  } catch (error: any) {
    console.error('Submit attempt error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

