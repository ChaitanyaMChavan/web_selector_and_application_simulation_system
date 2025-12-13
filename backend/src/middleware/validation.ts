import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined,
      })),
    });
  }
  next();
};

// Email validation
export const validateEmail = body('email')
  .trim()
  .isEmail()
  .withMessage('Please provide a valid email address')
  .normalizeEmail();

// Password validation with strength requirements
export const validatePassword = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number')
  .matches(/[^A-Za-z0-9]/)
  .withMessage('Password must contain at least one special character');

// Name validation
export const validateName = body('name')
  .trim()
  .isLength({ min: 2, max: 100 })
  .withMessage('Name must be between 2 and 100 characters')
  .matches(/^[a-zA-Z\s'-]+$/)
  .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes');

// Role validation
export const validateRole = body('role')
  .isIn(['ADMIN', 'AUTHOR', 'SELECTOR', 'APPLICANT'])
  .withMessage('Role must be one of: ADMIN, AUTHOR, SELECTOR, APPLICANT');

// UUID validation
export const validateUUID = (field: string = 'id') =>
  param(field)
    .isUUID()
    .withMessage(`Invalid ${field} format`);

// Score validation
export const validateScore = body('score')
  .optional()
  .isInt({ min: 0, max: 100 })
  .withMessage('Score must be between 0 and 100');

// Text validation (for prompts, feedback, etc.)
export const validateText = (field: string, minLength: number = 1, maxLength: number = 10000) =>
  body(field)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`)
    .escape(); // Sanitize HTML

// Integer validation
export const validateInteger = (field: string, min?: number, max?: number) => {
  let chain = body(field).isInt().withMessage(`${field} must be an integer`);
  if (min !== undefined) {
    chain = chain.isInt({ min }).withMessage(`${field} must be at least ${min}`);
  }
  if (max !== undefined) {
    chain = chain.isInt({ max }).withMessage(`${field} must be at most ${max}`);
  }
  return chain;
};

// Array validation
export const validateArray = (field: string, minLength: number = 1) =>
  body(field)
    .isArray({ min: minLength })
    .withMessage(`${field} must be an array with at least ${minLength} item(s)`);

// Common validation chains
export const signupValidation = [
  validateEmail,
  validatePassword,
  validateName,
  handleValidationErrors,
];

export const loginValidation = [
  validateEmail,
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

export const createUserValidation = [
  validateEmail,
  validatePassword,
  validateName,
  validateRole,
  handleValidationErrors,
];

export const updateUserValidation = [
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('password').optional().custom((value) => {
    if (value && value.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    return true;
  }),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('role').optional().isIn(['ADMIN', 'AUTHOR', 'SELECTOR', 'APPLICANT']),
  handleValidationErrors,
];

export const simulationValidation = [
  validateText('title', 1, 255),
  validateText('description', 0, 2000).optional(),
  validateInteger('timeLimitMinutes', 1, 1440).optional(),
  handleValidationErrors,
];

export const stepValidation = [
  body('type').isIn(['MCQ', 'WRITTEN', 'VIDEO', 'CODING']).withMessage('Invalid step type'),
  validateText('prompt', 1, 5000),
  body('options').optional().isArray(),
  validateInteger('order', 1).optional(),
  handleValidationErrors,
];

export const rubricValidation = [
  validateText('criterionName', 1, 255),
  validateText('description', 0, 1000).optional(),
  validateInteger('maxScore', 1, 100),
  validateInteger('order', 1).optional(),
  handleValidationErrors,
];

export const rubricScoreValidation = [
  body('rubricScores').isArray({ min: 1 }).withMessage('At least one rubric score is required'),
  body('rubricScores.*.rubricId').isUUID().withMessage('Invalid rubric ID'),
  body('rubricScores.*.score').isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  body('rubricScores.*.comment').optional().trim().isLength({ max: 1000 }),
  handleValidationErrors,
];

