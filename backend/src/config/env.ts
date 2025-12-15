import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('5000'),
  
  // Database
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().regex(/^\d+$/).transform(Number).default('5432'),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // CORS
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
  
  // Optional
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment variable validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  throw error;
}

// Validate JWT_SECRET strength in production
if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long in production');
  process.exit(1);
}

// Warn about default JWT_SECRET
if (env.JWT_SECRET === 'your-secret-key-change-in-production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Change this in production!');
}

export default env;


