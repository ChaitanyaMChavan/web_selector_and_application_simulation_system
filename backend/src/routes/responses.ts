import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../config/auth';
import { query } from '../config/database';

const router = express.Router();

// Helper to resolve upload path safely
const resolveUploadPath = (fileUrl: string) => {
  const withoutPrefix = fileUrl.replace(/^\/uploads\//, 'uploads/');
  const resolved = path.resolve(process.cwd(), withoutPrefix);
  // Prevent path traversal
  if (!resolved.startsWith(path.join(process.cwd(), 'uploads'))) {
    throw new Error('Invalid file path');
  }
  return resolved;
};

// GET /api/responses/:responseId/video - Stream video response
router.get('/:responseId/video', authenticate, authorize('ADMIN', 'SELECTOR', 'AUTHOR', 'APPLICANT'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { responseId } = req.params;

    const result = await query(
      `SELECT 
        r.answer,
        st.type,
        a.applicant_id,
        s.author_id
      FROM projectweb.responses r
      JOIN projectweb.steps st ON r.step_id = st.id
      JOIN projectweb.attempts a ON r.attempt_id = a.id
      JOIN projectweb.simulations s ON st.simulation_id = s.id
      WHERE r.id = $1`,
      [responseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Response not found' });
    }

    const response = result.rows[0];
    if (response.type !== 'VIDEO') {
      return res.status(400).json({ message: 'Response is not a video' });
    }

    // Authorization: applicant owns, author owns simulation, selectors/admins allowed
    if (user.role === 'APPLICANT' && response.applicant_id !== user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (user.role === 'AUTHOR' && response.author_id !== user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const filePath = resolveUploadPath(response.answer);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    return res.sendFile(filePath);
  } catch (error: any) {
    console.error('Stream video error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/responses/:responseId/file - Download coding file
router.get('/:responseId/file', authenticate, authorize('ADMIN', 'SELECTOR', 'AUTHOR', 'APPLICANT'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { responseId } = req.params;

    const result = await query(
      `SELECT 
        r.answer,
        st.type,
        a.applicant_id,
        s.author_id
      FROM projectweb.responses r
      JOIN projectweb.steps st ON r.step_id = st.id
      JOIN projectweb.attempts a ON r.attempt_id = a.id
      JOIN projectweb.simulations s ON st.simulation_id = s.id
      WHERE r.id = $1`,
      [responseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Response not found' });
    }

    const response = result.rows[0];
    if (response.type !== 'CODING') {
      return res.status(400).json({ message: 'Response is not a coding file' });
    }

    if (user.role === 'APPLICANT' && response.applicant_id !== user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (user.role === 'AUTHOR' && response.author_id !== user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const filePath = resolveUploadPath(response.answer);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    return res.download(filePath);
  } catch (error: any) {
    console.error('Download coding file error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

