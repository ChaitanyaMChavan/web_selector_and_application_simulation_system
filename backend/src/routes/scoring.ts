import express from 'express';
import { query } from '../config/database';
import { authenticate, authorize } from '../config/auth';

const router = express.Router();

// GET /api/scoring/pending - Get pending attempts
router.get('/pending', authenticate, authorize('SELECTOR', 'ADMIN'), async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        a.id,
        a.status,
        a.submitted_at,
        s.id as simulation_id,
        s.title as simulation_title,
        u.id as applicant_id,
        u.name as applicant_name,
        u.email as applicant_email
      FROM projectweb.attempts a
      JOIN projectweb.simulations s ON a.simulation_id = s.id
      JOIN projectweb.users u ON a.applicant_id = u.id
      WHERE a.status = 'SUBMITTED'
      ORDER BY a.submitted_at DESC`,
      []
    );

    const attempts = result.rows.map(attempt => ({
      id: attempt.id,
      status: attempt.status,
      submittedAt: attempt.submitted_at,
      simulation: {
        id: attempt.simulation_id,
        title: attempt.simulation_title,
      },
      applicant: {
        id: attempt.applicant_id,
        name: attempt.applicant_name,
        email: attempt.applicant_email,
      },
    }));

    return res.json(attempts);
  } catch (error: any) {
    console.error('Get pending attempts error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/scoring/attempt/:attemptId - Get attempt details for scoring
router.get('/attempt/:attemptId', authenticate, authorize('SELECTOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { attemptId } = req.params;

    // Get attempt with related data
    const attemptResult = await query(
      `SELECT 
        a.id,
        a.status,
        a.started_at,
        a.submitted_at,
        a.score,
        a.feedback,
        s.id as simulation_id,
        s.title as simulation_title,
        s.description as simulation_description,
        u.id as applicant_id,
        u.name as applicant_name,
        u.email as applicant_email
      FROM projectweb.attempts a
      JOIN projectweb.simulations s ON a.simulation_id = s.id
      JOIN projectweb.users u ON a.applicant_id = u.id
      WHERE a.id = $1`,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const attempt = attemptResult.rows[0];

    // Get steps
    const stepsResult = await query(
      `SELECT id, "order", type, prompt, options
       FROM projectweb.steps
       WHERE simulation_id = $1
       ORDER BY "order" ASC`,
      [attempt.simulation_id]
    );

    // Get responses
    const responsesResult = await query(
      'SELECT step_id, answer FROM projectweb.responses WHERE attempt_id = $1',
      [attemptId]
    );

    const responsesMap = new Map(
      responsesResult.rows.map(r => [r.step_id, r.answer])
    );

    // Get rubrics for each step
    const stepIds = stepsResult.rows.map(s => s.id);
    let rubricsMap = new Map();
    if (stepIds.length > 0) {
      const rubricsResult = await query(
        `SELECT id, step_id, criterion_name, description, max_score, "order"
         FROM projectweb.rubrics
         WHERE step_id = ANY($1)
         ORDER BY step_id, "order" ASC`,
        [stepIds]
      );

      rubricsMap = new Map(
        rubricsResult.rows.map(r => {
          const key = r.step_id;
          if (!rubricsMap.has(key)) {
            rubricsMap.set(key, []);
          }
          return r;
        })
      );

      // Group rubrics by step_id
      const groupedRubrics = new Map<string, any[]>();
      rubricsResult.rows.forEach(r => {
        const stepId = r.step_id;
        if (!groupedRubrics.has(stepId)) {
          groupedRubrics.set(stepId, []);
        }
        groupedRubrics.get(stepId)!.push({
          id: r.id,
          stepId: r.step_id,
          criterionName: r.criterion_name,
          description: r.description,
          maxScore: r.max_score,
          order: r.order,
        });
      });
      rubricsMap = groupedRubrics;
    }

    // Get existing rubric scores if attempt is already scored
    const existingScores = new Map();
    if (attempt.status === 'SCORED') {
      const scoresResult = await query(
        `SELECT rubric_id, score, comment
         FROM projectweb.scores
         WHERE attempt_id = $1 AND scored_by = $2`,
        [attemptId, user.userId]
      );
      scoresResult.rows.forEach(s => {
        existingScores.set(s.rubric_id, {
          score: s.score,
          comment: s.comment,
        });
      });
    }

    return res.json({
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      score: attempt.score,
      feedback: attempt.feedback,
      simulation: {
        id: attempt.simulation_id,
        title: attempt.simulation_title,
        description: attempt.simulation_description,
        steps: stepsResult.rows.map(step => ({
          id: step.id,
          order: step.order,
          type: step.type,
          prompt: step.prompt,
          options: step.options,
          rubrics: rubricsMap.get(step.id) || [],
        })),
      },
      applicant: {
        id: attempt.applicant_id,
        name: attempt.applicant_name,
        email: attempt.applicant_email,
      },
      responses: Array.from(responsesMap.entries()).map(([stepId, answer]) => ({
        stepId,
        answer,
      })),
      existingScores: Object.fromEntries(existingScores),
    });
  } catch (error: any) {
    console.error('Get attempt for scoring error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/scoring/attempt/:attemptId - Submit score (supports both simple and rubric-based)
router.post('/attempt/:attemptId', authenticate, authorize('SELECTOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { attemptId } = req.params;
    const { score, feedback, rubricScores } = req.body;

    // Check if attempt exists and is submitted
    const attemptResult = await query(
      'SELECT status FROM projectweb.attempts WHERE id = $1',
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attemptResult.rows[0].status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Attempt is not submitted' });
    }

    let finalScore = score;
    let calculatedScore = null;

    // If rubric scores are provided, calculate total score
    if (rubricScores && Array.isArray(rubricScores) && rubricScores.length > 0) {
      // Get all rubrics for this attempt's steps
      const rubricsResult = await query(
        `SELECT r.id, r.max_score, r.step_id
         FROM projectweb.rubrics r
         JOIN projectweb.steps s ON r.step_id = s.id
         JOIN projectweb.attempts a ON s.simulation_id = a.simulation_id
         WHERE a.id = $1`,
        [attemptId]
      );

      const rubricMap = new Map(rubricsResult.rows.map(r => [r.id, r]));
      let totalMaxScore = 0;
      let totalEarnedScore = 0;

      // Validate and save each rubric score
      for (const rubricScore of rubricScores) {
        const { rubricId, score: rubricScoreValue, comment } = rubricScore;
        
        if (!rubricMap.has(rubricId)) {
          return res.status(400).json({
            message: 'Validation failed',
            errors: [{ field: 'rubricScores', message: `Invalid rubric ID: ${rubricId}` }],
          });
        }

        const rubric = rubricMap.get(rubricId);
        if (rubricScoreValue < 0 || rubricScoreValue > rubric.max_score) {
          return res.status(400).json({
            message: 'Validation failed',
            errors: [{ field: 'rubricScores', message: `Score for rubric ${rubricId} must be between 0 and ${rubric.max_score}` }],
          });
        }

        totalMaxScore += rubric.max_score;
        totalEarnedScore += rubricScoreValue;

        // Upsert rubric score
        await query(
          `INSERT INTO projectweb.scores (attempt_id, rubric_id, score, comment, scored_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (attempt_id, rubric_id, scored_by)
           DO UPDATE SET score = $3, comment = $4, updated_at = CURRENT_TIMESTAMP`,
          [attemptId, rubricId, rubricScoreValue, comment || null, user.userId]
        );
      }

      // Calculate percentage score (0-100)
      calculatedScore = totalMaxScore > 0 
        ? Math.round((totalEarnedScore / totalMaxScore) * 100)
        : 0;
      finalScore = calculatedScore;
    } else {
      // Simple scoring (backward compatible)
      if (score === undefined || score === null || score < 0 || score > 100) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: [{ field: 'score', message: 'Score must be between 0 and 100' }],
        });
      }
    }

    // Update attempt with score
    const result = await query(
      `UPDATE projectweb.attempts 
       SET status = 'SCORED', 
           score = $1, 
           feedback = $2, 
           scored_at = CURRENT_TIMESTAMP, 
           scored_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, status, score, feedback, scored_at, scored_by`,
      [finalScore, feedback || null, user.userId, attemptId]
    );

    const updatedAttempt = result.rows[0];

    return res.json({
      id: updatedAttempt.id,
      status: updatedAttempt.status,
      score: updatedAttempt.score,
      feedback: updatedAttempt.feedback,
      scoredAt: updatedAttempt.scored_at,
      scoredBy: updatedAttempt.scored_by,
      calculatedFromRubrics: calculatedScore !== null,
    });
  } catch (error: any) {
    console.error('Score attempt error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/scoring/my-scores - Get scored attempts
router.get('/my-scores', authenticate, authorize('SELECTOR', 'ADMIN'), async (req, res) => {
  try {
    const user = (req as any).user;

    const result = await query(
      `SELECT 
        a.id,
        a.status,
        a.submitted_at,
        a.scored_at,
        a.score,
        a.feedback,
        s.id as simulation_id,
        s.title as simulation_title,
        u.id as applicant_id,
        u.name as applicant_name,
        u.email as applicant_email
      FROM projectweb.attempts a
      JOIN projectweb.simulations s ON a.simulation_id = s.id
      JOIN projectweb.users u ON a.applicant_id = u.id
      WHERE a.status = 'SCORED' AND a.scored_by = $1
      ORDER BY a.scored_at DESC`,
      [user.userId]
    );

    const attempts = result.rows.map(attempt => ({
      id: attempt.id,
      status: attempt.status,
      submittedAt: attempt.submitted_at,
      scoredAt: attempt.scored_at,
      score: attempt.score,
      feedback: attempt.feedback,
      simulation: {
        id: attempt.simulation_id,
        title: attempt.simulation_title,
      },
      applicant: {
        id: attempt.applicant_id,
        name: attempt.applicant_name,
        email: attempt.applicant_email,
      },
    }));

    return res.json(attempts);
  } catch (error: any) {
    console.error('Get my scores error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

