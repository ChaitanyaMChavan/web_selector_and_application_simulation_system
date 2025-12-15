import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import morgan from 'morgan';

// Import env first to load .env file
import env from './config/env';

// Import Cloudinary after env is loaded
import './utils/cloudinary';

// Import security middleware
import { helmetConfig, generalRateLimiter, authRateLimiter } from './middleware/security';

// Import routes
import authRoutes from './routes/auth';
import simulationRoutes from './routes/simulations';
import attemptRoutes from './routes/attempts';
import scoringRoutes from './routes/scoring';
import adminRoutes from './routes/admin';
import rubricRoutes from './routes/rubrics';
import responseRoutes from './routes/responses';

const app = express();
const PORT = env.PORT;
const CORS_ORIGIN = env.CORS_ORIGIN;

// Security middleware (must be first)
app.use(helmetConfig);

// Request logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiting (apply to all routes)
app.use('/api', generalRateLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Routes
// Auth routes with stricter rate limiting
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rubrics', rubricRoutes);
app.use('/api/responses', responseRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  if (env.NODE_ENV === 'production') {
    console.log(`🔒 Security: Rate limiting, Helmet, Input validation enabled`);
  }
});
