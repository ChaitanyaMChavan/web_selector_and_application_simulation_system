import { Pool } from 'pg';
import env from './env';

// Database connection pool
const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Set default schema on connection and log connection
// Note: We use .then() instead of async/await because event handlers don't properly await promises
pool.on('connect', (client) => {
  // Use .then() and .catch() to properly handle the promise
  client.query('SET search_path TO projectweb')
    .then(() => {
      console.log('Database connected');
    })
    .catch((error) => {
      console.error('Failed to set search_path on connection:', error);
      // Don't throw - let the connection be used, but log the error
      // The query helper will handle schema issues
    });
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text: text.substring(0, 100), error });
    throw error;
  }
}

// Helper function to get a client from the pool for transactions
export async function getClient() {
  const client = await pool.connect();
  return client;
}

