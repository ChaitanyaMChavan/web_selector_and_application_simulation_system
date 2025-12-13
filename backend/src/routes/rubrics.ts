import express from 'express';
import { query } from '../config/database';
import { authenticate, authorize } from '../config/auth';

const router = express.Router();

// GET /api/rubrics/step/:stepId - Get all rubrics for a step
router.get('/step/:stepId', authenticate, async (req, res) => {
  try {
    const { stepId } = req.params;
    const user = (req as any).user;

    // Check if user has access to this step
    // Authors can view rubrics for their simulations, selectors can view for scoring
    const stepResult = await query(
      `SELECT s.id, s.simulation_id, sim.author_id, sim.status
       FROM projectweb.steps s
       JOIN projectweb.simulations sim ON s.simulation_id = sim.id
       WHERE s.id = $1`,
      [stepId]
    );

    if (stepResult.rows.length === 0) {
      return res.status(404).json({ message: 'Step not found' });
    }

    const step = stepResult.rows[0];

    // Check access: Author owns simulation, or user is selector/admin
    if (
      user.role !== 'ADMIN' &&
      user.role !== 'SELECTOR' &&
      step.author_id !== user.userId
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const result = await query(
      `SELECT 
        id,
        step_id,
        criterion_name,
        description,
        max_score,
        "order",
        created_at
      FROM projectweb.rubrics
      WHERE step_id = $1
      ORDER BY "order" ASC`,
      [stepId]
    );

    const rubrics = result.rows.map(rubric => ({
      id: rubric.id,
      stepId: rubric.step_id,
      criterionName: rubric.criterion_name,
      description: rubric.description,
      maxScore: rubric.max_score,
      order: rubric.order,
      createdAt: rubric.created_at,
    }));

    return res.json(rubrics);
  } catch (error: any) {
    console.error('Get rubrics error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/rubrics/step/:stepId - Create rubric for a step
router.post('/step/:stepId', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const { stepId } = req.params;
    const { criterionName, description, maxScore, order } = req.body;
    const user = (req as any).user;

    // Validation
    if (!criterionName || maxScore === undefined) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'all', message: 'Criterion name and max score are required' }],
      });
    }

    if (maxScore <= 0 || maxScore > 100) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'maxScore', message: 'Max score must be between 1 and 100' }],
      });
    }

    // Check step ownership
    const stepResult = await query(
      `SELECT s.id, s.simulation_id, sim.author_id
       FROM projectweb.steps s
       JOIN projectweb.simulations sim ON s.simulation_id = sim.id
       WHERE s.id = $1`,
      [stepId]
    );

    if (stepResult.rows.length === 0) {
      return res.status(404).json({ message: 'Step not found' });
    }

    const step = stepResult.rows[0];

    if (step.author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get next order if not provided
    let rubricOrder = order;
    if (rubricOrder === undefined) {
      const orderResult = await query(
        'SELECT COALESCE(MAX("order"), 0) + 1 as next_order FROM projectweb.rubrics WHERE step_id = $1',
        [stepId]
      );
      rubricOrder = parseInt(orderResult.rows[0].next_order);
    }

    // Create rubric
    const result = await query(
      `INSERT INTO projectweb.rubrics (step_id, criterion_name, description, max_score, "order")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [stepId, criterionName, description || null, maxScore, rubricOrder]
    );

    const rubric = result.rows[0];

    return res.status(201).json({
      id: rubric.id,
      stepId: rubric.step_id,
      criterionName: rubric.criterion_name,
      description: rubric.description,
      maxScore: rubric.max_score,
      order: rubric.order,
      createdAt: rubric.created_at,
    });
  } catch (error: any) {
    console.error('Create rubric error:', error);
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'order', message: 'A rubric with this order already exists' }],
      });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/rubrics/:id - Update rubric
router.patch('/:id', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { criterionName, description, maxScore, order } = req.body;
    const user = (req as any).user;

    // Check rubric exists and ownership
    const rubricResult = await query(
      `SELECT r.id, r.step_id, s.simulation_id, sim.author_id
       FROM projectweb.rubrics r
       JOIN projectweb.steps s ON r.step_id = s.id
       JOIN projectweb.simulations sim ON s.simulation_id = sim.id
       WHERE r.id = $1`,
      [id]
    );

    if (rubricResult.rows.length === 0) {
      return res.status(404).json({ message: 'Rubric not found' });
    }

    const rubric = rubricResult.rows[0];

    if (rubric.author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (criterionName !== undefined) {
      updates.push(`criterion_name = $${paramIndex++}`);
      values.push(criterionName);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (maxScore !== undefined) {
      if (maxScore <= 0 || maxScore > 100) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ field: 'maxScore', message: 'Max score must be between 1 and 100' }],
        });
      }
      updates.push(`max_score = $${paramIndex++}`);
      values.push(maxScore);
    }

    if (order !== undefined) {
      updates.push(`"order" = $${paramIndex++}`);
      values.push(order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const result = await query(
      `UPDATE projectweb.rubrics 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    const updatedRubric = result.rows[0];

    return res.json({
      id: updatedRubric.id,
      stepId: updatedRubric.step_id,
      criterionName: updatedRubric.criterion_name,
      description: updatedRubric.description,
      maxScore: updatedRubric.max_score,
      order: updatedRubric.order,
      createdAt: updatedRubric.created_at,
    });
  } catch (error: any) {
    console.error('Update rubric error:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        message: 'Validation failed',
        errors: [{ field: 'order', message: 'A rubric with this order already exists' }],
      });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/rubrics/:id - Delete rubric
router.delete('/:id', authenticate, authorize('AUTHOR', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Check rubric exists and ownership
    const rubricResult = await query(
      `SELECT r.id, r.step_id, s.simulation_id, sim.author_id
       FROM projectweb.rubrics r
       JOIN projectweb.steps s ON r.step_id = s.id
       JOIN projectweb.simulations sim ON s.simulation_id = sim.id
       WHERE r.id = $1`,
      [id]
    );

    if (rubricResult.rows.length === 0) {
      return res.status(404).json({ message: 'Rubric not found' });
    }

    const rubric = rubricResult.rows[0];

    if (rubric.author_id !== user.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await query('DELETE FROM projectweb.rubrics WHERE id = $1', [id]);

    return res.json({ message: 'Rubric deleted successfully' });
  } catch (error: any) {
    console.error('Delete rubric error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

