import express from 'express';
import { query } from '../config/database';
import { authenticate, authorize } from '../config/auth';
import { videoUpload, codingFileUpload, uploadsVideoPath, uploadsFilePath } from '../utils/upload';
import { uploadVideo, uploadFile } from '../utils/cloudinary';
import fs from 'fs';

const router = express.Router();

// GET /api/attempts/my-attempts - Get all attempts by applicant
// This must come before /:attemptId route to avoid route conflicts
router.get('/my-attempts', authenticate, authorize('APPLICANT'), async (req, res) => {
  try {
    const user = (req as any).user;

    const result = await query(
      `SELECT 
        a.id,
        a.status,
        a.started_at,
        a.submitted_at,
        a.score,
        a.feedback,
        s.id as simulation_id,
        s.title as simulation_title,
        s.description as simulation_description
      FROM projectweb.attempts a
      JOIN projectweb.simulations s ON a.simulation_id = s.id
      WHERE a.applicant_id = $1
      ORDER BY a.started_at DESC`,
      [user.userId]
    );

    const attempts = result.rows.map(attempt => ({
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
      },
    }));

    return res.json(attempts);
  } catch (error: any) {
    console.error('Get my attempts error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/attempts/:attemptId - Get attempt details (for applicants to view results)
router.get('/:attemptId', authenticate, authorize('APPLICANT'), async (req, res) => {
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
        s.time_limit_minutes
      FROM projectweb.attempts a
      JOIN projectweb.simulations s ON a.simulation_id = s.id
      WHERE a.id = $1 AND a.applicant_id = $2`,
      [attemptId, user.userId]
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
        timeLimitMinutes: attempt.time_limit_minutes,
        steps: stepsResult.rows.map(step => ({
          id: step.id,
          order: step.order,
          type: step.type,
          prompt: step.prompt,
          options: step.options,
        })),
      },
      responses: Array.from(responsesMap.entries()).map(([stepId, answer]) => ({
        stepId,
        answer,
      })),
    });
  } catch (error: any) {
    console.error('Get attempt error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

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

    // Verify attempt ownership and status, and check time limit
    const attemptResult = await query(
      `SELECT 
        a.applicant_id, 
        a.status, 
        a.started_at,
        s.time_limit_minutes
      FROM projectweb.attempts a
      JOIN projectweb.simulations s ON a.simulation_id = s.id
      WHERE a.id = $1`,
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

    // Check time limit - allow saving responses even if time exceeded (for auto-save)
    // But we'll prevent submission if time exceeded
    if (attempt.time_limit_minutes) {
      const startedAt = new Date(attempt.started_at);
      const now = new Date();
      const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 1000 / 60);

      if (elapsedMinutes > attempt.time_limit_minutes) {
        // Time exceeded - still allow saving but return warning
        // The submit endpoint will block actual submission
      }
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

// POST /api/attempts/:attemptId/response/video - Upload video response
router.post(
  '/:attemptId/response/video',
  authenticate,
  authorize('APPLICANT'),
  videoUpload.single('video'),
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { attemptId } = req.params;
      const { stepId } = req.body;

      if (!stepId || !req.file) {
        return res.status(400).json({ message: 'stepId and video file are required' });
      }

      // Verify attempt ownership/status and step type
      const attemptResult = await query(
        `SELECT 
          a.applicant_id, 
          a.status, 
          s.id as simulation_id
        FROM projectweb.attempts a
        JOIN projectweb.simulations s ON a.simulation_id = s.id
        WHERE a.id = $1`,
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

      // Verify step belongs to simulation and is VIDEO
      const stepResult = await query(
        `SELECT type FROM projectweb.steps WHERE id = $1 AND simulation_id = $2`,
        [stepId, attempt.simulation_id]
      );
      if (stepResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid step for this simulation' });
      }
      if (stepResult.rows[0].type !== 'VIDEO') {
        return res.status(400).json({ message: 'Step is not a video step' });
      }

      // Upload to Cloudinary or use local storage
      let fileUrl: string;
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        console.log(`Attempting to upload video to Cloudinary: ${req.file.filename} (${fileBuffer.length} bytes)`);
        const uploadResult = await uploadVideo(fileBuffer, req.file.filename);
        fileUrl = uploadResult.secure_url;
        console.log(`✅ Video uploaded to Cloudinary: ${fileUrl}`);
        // Delete local file after successful Cloudinary upload
        fs.unlinkSync(req.file.path);
      } catch (cloudinaryError: any) {
        // Fallback to local storage if Cloudinary fails
        console.error('❌ Cloudinary upload failed:', cloudinaryError.message);
        console.error('   Error details:', cloudinaryError);
        console.warn('   Falling back to local storage');
        fileUrl = `${uploadsVideoPath}/${req.file.filename}`;
      }

      // Upsert response with file URL
      const result = await query(
        `INSERT INTO projectweb.responses (attempt_id, step_id, answer)
         VALUES ($1, $2, $3)
         ON CONFLICT (attempt_id, step_id)
         DO UPDATE SET answer = $3, updated_at = CURRENT_TIMESTAMP
         RETURNING id, attempt_id, step_id, answer, created_at, updated_at`,
        [attemptId, stepId, fileUrl]
      );

      const response = result.rows[0];
      return res.json({
        id: response.id,
        attemptId: response.attempt_id,
        stepId: response.step_id,
        videoUrl: response.answer,
      });
    } catch (error: any) {
      console.error('Upload video response error:', error);
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }
);

// POST /api/attempts/:attemptId/response/file - Upload coding file
router.post(
  '/:attemptId/response/file',
  authenticate,
  authorize('APPLICANT'),
  codingFileUpload.single('file'),
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { attemptId } = req.params;
      const { stepId } = req.body;

      if (!stepId || !req.file) {
        return res.status(400).json({ message: 'stepId and file are required' });
      }

      const attemptResult = await query(
        `SELECT 
          a.applicant_id, 
          a.status, 
          s.id as simulation_id
        FROM projectweb.attempts a
        JOIN projectweb.simulations s ON a.simulation_id = s.id
        WHERE a.id = $1`,
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

      const stepResult = await query(
        `SELECT type FROM projectweb.steps WHERE id = $1 AND simulation_id = $2`,
        [stepId, attempt.simulation_id]
      );
      if (stepResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid step for this simulation' });
      }
      if (stepResult.rows[0].type !== 'CODING') {
        return res.status(400).json({ message: 'Step is not a coding step' });
      }

      // Upload to Cloudinary or use local storage
      let fileUrl: string;
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        console.log(`Attempting to upload file to Cloudinary: ${req.file.filename} (${fileBuffer.length} bytes)`);
        const uploadResult = await uploadFile(fileBuffer, req.file.filename);
        fileUrl = uploadResult.secure_url;
        console.log(`✅ File uploaded to Cloudinary: ${fileUrl}`);
        // Delete local file after successful Cloudinary upload
        fs.unlinkSync(req.file.path);
      } catch (cloudinaryError: any) {
        // Fallback to local storage if Cloudinary fails
        console.error('❌ Cloudinary upload failed:', cloudinaryError.message);
        console.error('   Error details:', cloudinaryError);
        console.warn('   Falling back to local storage');
        fileUrl = `${uploadsFilePath}/${req.file.filename}`;
      }

      const result = await query(
        `INSERT INTO projectweb.responses (attempt_id, step_id, answer)
         VALUES ($1, $2, $3)
         ON CONFLICT (attempt_id, step_id)
         DO UPDATE SET answer = $3, updated_at = CURRENT_TIMESTAMP
         RETURNING id, attempt_id, step_id, answer, created_at, updated_at`,
        [attemptId, stepId, fileUrl]
      );

      const response = result.rows[0];
      return res.json({
        id: response.id,
        attemptId: response.attempt_id,
        stepId: response.step_id,
        fileUrl: response.answer,
      });
    } catch (error: any) {
      console.error('Upload coding file error:', error);
      return res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }
);

// POST /api/attempts/:attemptId/submit - Submit attempt
router.post('/:attemptId/submit', authenticate, authorize('APPLICANT'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { attemptId } = req.params;

    // Verify attempt ownership and status
    const attemptResult = await query(
      `SELECT 
        a.applicant_id, 
        a.status, 
        a.started_at,
        s.time_limit_minutes
      FROM projectweb.attempts a
      JOIN projectweb.simulations s ON a.simulation_id = s.id
      WHERE a.id = $1`,
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

    // Check time limit enforcement
    if (attempt.time_limit_minutes) {
      const startedAt = new Date(attempt.started_at);
      const now = new Date();
      const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 1000 / 60);

      if (elapsedMinutes > attempt.time_limit_minutes) {
        return res.status(400).json({
          message: 'Time limit exceeded',
          errors: [
            {
              field: 'time',
              message: `Time limit of ${attempt.time_limit_minutes} minutes has been exceeded. The attempt cannot be submitted.`,
            },
          ],
        });
      }
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

