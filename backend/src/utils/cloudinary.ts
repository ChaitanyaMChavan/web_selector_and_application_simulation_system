import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first (in case this module is imported before env.ts)
// Explicitly specify the path to ensure we're reading from backend/.env
const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Could not load .env file from ${envPath}`);
} else {
  console.log(`📄 Loaded .env file from ${envPath}`);
}

// Check if Cloudinary is configured
// Support both individual vars and CLOUDINARY_URL format
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Check if using URL format or individual variables
const isCloudinaryConfigured = 
  CLOUDINARY_URL !== undefined && CLOUDINARY_URL !== '' ||
  (CLOUDINARY_CLOUD_NAME && 
   CLOUDINARY_API_KEY && 
   CLOUDINARY_API_SECRET &&
   CLOUDINARY_CLOUD_NAME !== '' &&
   CLOUDINARY_API_KEY !== '' &&
   CLOUDINARY_API_SECRET !== '');

if (isCloudinaryConfigured) {
  // Configure Cloudinary - prefer URL format if available
  if (CLOUDINARY_URL) {
    cloudinary.config(CLOUDINARY_URL);
    console.log('✅ Cloudinary configured using CLOUDINARY_URL');
  } else {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true, // Use HTTPS
    });
    console.log('✅ Cloudinary configured using individual variables');
    console.log(`   Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);
    console.log(`   API Key: ${CLOUDINARY_API_KEY}`);
    console.log(`   API Secret: ${CLOUDINARY_API_SECRET ? `${CLOUDINARY_API_SECRET.substring(0, 4)}...` : 'NOT SET'}`);
  }
  
  // Test Cloudinary connection
  cloudinary.api.ping((error: any, result: any) => {
    if (error) {
      console.error('❌ Cloudinary connection test failed:', error.message);
      console.error('   Error code:', error.http_code);
      console.error('   This usually means:');
      console.error('   1. The API secret is incorrect (most common)');
      console.error('   2. There are IP restrictions in Security settings');
      console.error('   3. The API key/secret don\'t match');
      console.error('   Please check:');
      console.error('   - Go to Settings → Security in Cloudinary dashboard');
      console.error('   - Click "Show" next to API Secret and copy it exactly');
      console.error('   - Verify no spaces or quotes in .env file');
      console.error('   - Check if IP restrictions are enabled (disable for testing)');
    } else {
      console.log('✅ Cloudinary connection test successful');
      console.log('   Status:', result.status);
    }
  });
} else {
  console.warn('⚠️  Cloudinary not configured. File uploads will use local storage.');
  console.warn('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env to use Cloudinary');
  console.warn(`   Current values: CLOUD_NAME=${CLOUDINARY_CLOUD_NAME || 'NOT SET'}, API_KEY=${CLOUDINARY_API_KEY ? 'SET' : 'NOT SET'}, API_SECRET=${CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'}`);
}

export interface UploadResult {
  url: string;
  public_id: string;
  secure_url: string;
}

/**
 * Upload video to Cloudinary
 */
export async function uploadVideo(file: Buffer, filename: string): Promise<UploadResult> {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file');
  }
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'simassess/videos',
        format: 'mp4',
        public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.url,
            public_id: result.public_id,
            secure_url: result.secure_url,
          });
        } else {
          reject(new Error('Upload failed'));
        }
      }
    );

    uploadStream.end(file);
  });
}

/**
 * Upload file to Cloudinary
 */
export async function uploadFile(file: Buffer, filename: string): Promise<UploadResult> {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file');
  }
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'simassess/files',
        public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.url,
            public_id: result.public_id,
            secure_url: result.secure_url,
          });
        } else {
          reject(new Error('Upload failed'));
        }
      }
    );

    uploadStream.end(file);
  });
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string, resourceType: 'video' | 'raw' = 'raw'): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    // Don't throw - deletion is not critical
  }
}

export default cloudinary;

