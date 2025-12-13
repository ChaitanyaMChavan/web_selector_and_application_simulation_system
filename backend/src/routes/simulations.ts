import express from 'express';
import { query } from '../config/database';
import { authenticate, authorize } from '../config/auth';

const router = express.Router();

// GET /api/simulations/mine - Get author's simulations
router.get('/mine', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;

    const result = await query(
      `SELECT 
        s.id,
        s.title,
        s.description,
        s.status,
        s.time_limit_minutes,
        s.author_id,
        s.created_at,
        s.updated_at,
        COUNT(st.id) as step_count
      FROM projectweb.simulations s
      LEFT JOIN projectweb.steps st ON s.id = st.simulation_id
      WHERE s.author_id = $1
      GROUP BY s.id
      ORDER BY s.created_at DESC`,
      [user.userId]
    );

    const simulations = result.rows.map(sim => ({
      id: sim.id,
      title: sim.title,
      description: sim.description,
      status: sim.status,
      timeLimitMinutes: sim.time_limit_minutes,
      authorId: sim.author_id,
      createdAt: sim.created_at,
      updatedAt: sim.updated_at,
      _count: {
        steps: parseInt(sim.step_count) || 0,
      },
    }));

    return res.json(simulations);
  } catch (error: any) {
    console.error('Get simulations error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/simulations/published - Get published simulations (for applicants)
router.get('/published', authenticate, authorize('APPLICANT'), async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        s.id,
        s.title,
        s.description,
        s.status,
        s.time_limit_minutes,
        s.created_at,
        COUNT(st.id) as step_count
      FROM projectweb.simulations s
      LEFT JOIN projectweb.steps st ON s.id = st.simulation_id
      WHERE s.status = 'PUBLISHED'
      GROUP BY s.id
      ORDER BY s.created_at DESC`,
      []
    );

    const simulations = result.rows.map(sim => ({
      id: sim.id,
      title: sim.title,
      description: sim.description,
      status: sim.status,
      timeLimitMinutes: sim.time_limit_minutes,
      createdAt: sim.created_at,
      _count: {
        steps: parseInt(sim.step_count) || 0,
      },
    }));

    return res.json(simulations);
  } catch (error: any) {
    console.error('Get published simulations error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/simulations - Create simulation
router.post('/', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, description, timeLimitMinutes } = req.body;

    // Validation
    if (!title || title.length > 200) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'title', message: 'Title is required and must be less than 200 characters' }],
      });
    }

    if (!description) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'description', message: 'Description is required' }],
      });
    }

    if (!timeLimitMinutes || timeLimitMinutes < 5 || timeLimitMinutes > 180) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'timeLimitMinutes', message: 'Time limit must be between 5 and 180 minutes' }],
      });
    }

    const result = await query(
      `INSERT INTO projectweb.simulations (title, description, time_limit_minutes, author_id, status)
       VALUES ($1, $2, $3, $4, 'DRAFT')
       RETURNING id, title, description, status, time_limit_minutes, author_id, created_at, updated_at`,
      [title, description, timeLimitMinutes, user.userId]
    );

    const simulation = result.rows[0];

    return res.status(201).json({
      id: simulation.id,
      title: simulation.title,
      description: simulation.description,
      status: simulation.status,
      timeLimitMinutes: simulation.time_limit_minutes,
      authorId: simulation.author_id,
      createdAt: simulation.created_at,
      updatedAt: simulation.updated_at,
    });
  } catch (error: any) {
    console.error('Create simulation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/simulations/:id - Get simulation details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const simulationId = req.params.id;

    // Get simulation
    const simResult = await query(
      'SELECT * FROM projectweb.simulations WHERE id = $1',
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      return res.status(404).json({ message: 'Simulation not found' });
    }

    const simulation = simResult.rows[0];

    // Check access: AUTHOR can see own, APPLICANT can see published
    if (user.role === 'APPLICANT' && simulation.status !== 'PUBLISHED') {
      return res.status(404).json({ message: 'Simulation not found' });
    }

    if ((user.role === 'AUTHOR' || user.role === 'ADMIN') && simulation.author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get steps
    const stepsResult = await query(
      'SELECT * FROM projectweb.steps WHERE simulation_id = $1 ORDER BY "order" ASC',
      [simulationId]
    );

    return res.json({
      id: simulation.id,
      title: simulation.title,
      description: simulation.description,
      status: simulation.status,
      timeLimitMinutes: simulation.time_limit_minutes,
      authorId: simulation.author_id,
      createdAt: simulation.created_at,
      updatedAt: simulation.updated_at,
      steps: stepsResult.rows.map(step => ({
        id: step.id,
        order: step.order,
        type: step.type,
        prompt: step.prompt,
        options: step.options,
      })),
    });
  } catch (error: any) {
    console.error('Get simulation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/simulations/:id - Update simulation
router.patch('/:id', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;
    const simulationId = req.params.id;
    const body = req.body;

    // Check ownership
    const simResult = await query(
      'SELECT author_id FROM projectweb.simulations WHERE id = $1',
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      return res.status(404).json({ message: 'Simulation not found' });
    }

    if (simResult.rows[0].author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(body.title);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.timeLimitMinutes !== undefined) {
      updates.push(`time_limit_minutes = $${paramIndex++}`);
      values.push(body.timeLimitMinutes);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(simulationId);
    const result = await query(
      `UPDATE projectweb.simulations 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    const simulation = result.rows[0];

    return res.json({
      id: simulation.id,
      title: simulation.title,
      description: simulation.description,
      status: simulation.status,
      timeLimitMinutes: simulation.time_limit_minutes,
      authorId: simulation.author_id,
      createdAt: simulation.created_at,
      updatedAt: simulation.updated_at,
    });
  } catch (error: any) {
    console.error('Update simulation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/simulations/:id/steps - Get simulation steps
router.get('/:id/steps', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const simulationId = req.params.id;

    // Check access
    const simResult = await query(
      'SELECT author_id, status FROM projectweb.simulations WHERE id = $1',
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      return res.status(404).json({ message: 'Simulation not found' });
    }

    const simulation = simResult.rows[0];

    if (user.role === 'APPLICANT' && simulation.status !== 'PUBLISHED') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if ((user.role === 'AUTHOR' || user.role === 'ADMIN') && simulation.author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const result = await query(
      'SELECT * FROM projectweb.steps WHERE simulation_id = $1 ORDER BY "order" ASC',
      [simulationId]
    );

    return res.json(
      result.rows.map(step => ({
        id: step.id,
        simulationId: step.simulation_id,
        order: step.order,
        type: step.type,
        prompt: step.prompt,
        options: step.options,
        createdAt: step.created_at,
      }))
    );
  } catch (error: any) {
    console.error('Get steps error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/simulations/:id/steps - Add step to simulation
router.post('/:id/steps', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;
    const simulationId = req.params.id;
    const { type, prompt, order, options } = req.body;

    // Validation
    if (!type || !['MCQ', 'WRITTEN', 'VIDEO', 'CODING'].includes(type)) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'type', message: 'Type must be MCQ, WRITTEN, VIDEO, or CODING' }],
      });
    }

    if (!prompt) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'prompt', message: 'Prompt is required' }],
      });
    }

    if (order === undefined || order === null) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'order', message: 'Order is required' }],
      });
    }

    if (type === 'MCQ' && (!options || !Array.isArray(options) || options.length === 0)) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'options', message: 'Options array is required for MCQ type' }],
      });
    }

    // Check ownership
    const simResult = await query(
      'SELECT author_id FROM projectweb.simulations WHERE id = $1',
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      return res.status(404).json({ message: 'Simulation not found' });
    }

    if (simResult.rows[0].author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const result = await query(
      `INSERT INTO projectweb.steps (simulation_id, "order", type, prompt, options)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [simulationId, order, type, prompt, type === 'MCQ' ? JSON.stringify(options) : null]
    );

    const step = result.rows[0];

    return res.status(201).json({
      id: step.id,
      simulationId: step.simulation_id,
      order: step.order,
      type: step.type,
      prompt: step.prompt,
      options: step.options,
      createdAt: step.created_at,
    });
  } catch (error: any) {
    console.error('Create step error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/simulations/:id/steps/:stepId - Update step
router.patch('/:id/steps/:stepId', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { id: simulationId, stepId } = req.params;
    const body = req.body;

    // Check ownership
    const simResult = await query(
      'SELECT author_id FROM projectweb.simulations WHERE id = $1',
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      return res.status(404).json({ message: 'Simulation not found' });
    }

    if (simResult.rows[0].author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Check if step exists
    const stepResult = await query(
      'SELECT id FROM projectweb.steps WHERE id = $1 AND simulation_id = $2',
      [stepId, simulationId]
    );

    if (stepResult.rows.length === 0) {
      return res.status(404).json({ message: 'Step not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.type !== undefined) {
      if (!['MCQ', 'WRITTEN', 'VIDEO', 'CODING'].includes(body.type)) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ field: 'type', message: 'Type must be MCQ, WRITTEN, VIDEO, or CODING' }],
        });
      }
      updates.push(`type = $${paramIndex++}`);
      values.push(body.type);
    }

    if (body.prompt !== undefined) {
      updates.push(`prompt = $${paramIndex++}`);
      values.push(body.prompt);
    }

    if (body.order !== undefined) {
      updates.push(`"order" = $${paramIndex++}`);
      values.push(body.order);
    }

    if (body.options !== undefined) {
      if (body.type === 'MCQ' && (!Array.isArray(body.options) || body.options.length === 0)) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ field: 'options', message: 'Options array is required for MCQ type' }],
        });
      }
      updates.push(`options = $${paramIndex++}`);
      values.push(body.type === 'MCQ' ? JSON.stringify(body.options) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(stepId);
    const result = await query(
      `UPDATE projectweb.steps 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    const step = result.rows[0];

    return res.json({
      id: step.id,
      simulationId: step.simulation_id,
      order: step.order,
      type: step.type,
      prompt: step.prompt,
      options: step.options,
      createdAt: step.created_at,
    });
  } catch (error: any) {
    console.error('Update step error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/simulations/:id/steps/:stepId - Delete step
router.delete('/:id/steps/:stepId', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { id: simulationId, stepId } = req.params;

    // Check ownership
    const simResult = await query(
      'SELECT author_id FROM projectweb.simulations WHERE id = $1',
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      return res.status(404).json({ message: 'Simulation not found' });
    }

    if (simResult.rows[0].author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Check if step exists
    const stepResult = await query(
      'SELECT id FROM projectweb.steps WHERE id = $1 AND simulation_id = $2',
      [stepId, simulationId]
    );

    if (stepResult.rows.length === 0) {
      return res.status(404).json({ message: 'Step not found' });
    }

    await query('DELETE FROM projectweb.steps WHERE id = $1', [stepId]);

    return res.json({ message: 'Step deleted successfully' });
  } catch (error: any) {
    console.error('Delete step error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/simulations/:id/steps/reorder - Reorder steps
router.patch('/:id/steps/reorder', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { id: simulationId } = req.params;
    const { steps } = req.body;

    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'steps', message: 'Steps array is required' }],
      });
    }

    // Check ownership
    const simResult = await query(
      'SELECT author_id FROM projectweb.simulations WHERE id = $1',
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      return res.status(404).json({ message: 'Simulation not found' });
    }

    if (simResult.rows[0].author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Validate all step IDs belong to this simulation
    const stepIds = steps.map((s: any) => s.id);
    const stepCheck = await query(
      'SELECT id FROM projectweb.steps WHERE id = ANY($1) AND simulation_id = $2',
      [stepIds, simulationId]
    );

    if (stepCheck.rows.length !== stepIds.length) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'steps', message: 'Some step IDs are invalid or do not belong to this simulation' }],
      });
    }

    // Update step orders in a transaction
    const { getClient } = require('../config/database');
    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const step of steps) {
        await client.query(
          'UPDATE projectweb.steps SET "order" = $1 WHERE id = $2',
          [step.order, step.id]
        );
      }

      await client.query('COMMIT');

      // Return updated steps
      const result = await query(
        `SELECT id, "order", type, prompt, options
         FROM projectweb.steps
         WHERE simulation_id = $1
         ORDER BY "order" ASC`,
        [simulationId]
      );

      return res.json({
        steps: result.rows.map(step => ({
          id: step.id,
          order: step.order,
          type: step.type,
          prompt: step.prompt,
          options: step.options,
        })),
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Reorder steps error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

