import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

/**
 * Storage Service - handles permanent file storage in Supabase Storage
 * Uses Service Role Key for full storage access
 */

// Create Supabase client with Service Role Key for Storage operations
const supabaseStorage = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const BUCKET_NAME = 'generated-content';

/**
 * Initialize storage bucket if it doesn't exist
 * Note: If bucket creation fails due to RLS policy, create it manually in Supabase Dashboard
 */
export async function initializeStorage() {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabaseStorage.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`📦 Bucket '${BUCKET_NAME}' not found.`);
      console.log('⚠️  Please create it manually in Supabase Dashboard:');
      console.log('   1. Go to Storage → Buckets');
      console.log('   2. Create bucket: generated-content');
      console.log('   3. Set as Public');
      console.log('   4. Restart server');
      console.log('');
      return false;
    } else {
      console.log('✅ Storage bucket exists');
    }
    
    return true;
  } catch (error) {
    console.error('Storage initialization error:', error);
    return false;
  }
}

/**
 * Download file from URL and upload to Supabase Storage
 * @param {string} url - Temporary URL from Replicate
 * @param {string} contentType - Type of content (image, video, audio)
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<Object>} - Permanent URL from Supabase Storage
 */
export async function uploadFromUrl(url, contentType, userId = 'anonymous') {
  try {
    console.log(`📥 Downloading file from: ${url.substring(0, 60)}...`);
    
    // Download file from Replicate
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // Get content type from response headers
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Determine file extension
    const ext = getFileExtension(mimeType, contentType);
    
    // Generate unique filename
    const filename = `${userId}/${contentType}/${uuidv4()}${ext}`;
    
    // Convert response to buffer
    const buffer = await response.buffer();
    
    console.log(`📤 Uploading to Supabase Storage: ${filename}`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: false
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabaseStorage.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);
    
    console.log(`✅ File uploaded successfully: ${urlData.publicUrl}`);
    
    return {
      success: true,
      url: urlData.publicUrl,
      filename: filename,
      mimeType: mimeType
    };
    
  } catch (error) {
    console.error('Upload from URL error:', error);
    return {
      success: false,
      error: error.message,
      originalUrl: url
    };
  }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType, contentType) {
  // Check MIME type first
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
  if (mimeType.includes('gif')) return '.gif';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('webm')) return '.webm';
  if (mimeType.includes('mpeg')) return '.mpeg';
  if (mimeType.includes('mp3')) return '.mp3';
  if (mimeType.includes('wav')) return '.wav';
  
  // Fallback to content type
  if (contentType === 'image') return '.png';
  if (contentType === 'video') return '.mp4';
  if (contentType === 'audio') return '.mp3';
  
  return '';
}

/**
 * Delete file from storage
 */
export async function deleteFile(filename) {
  try {
    const { error } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .remove([filename]);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Migrate existing content URLs to permanent storage
 * This function can be called to fix all existing expired URLs
 */
export async function migrateExistingUrls() {
  try {
    console.log('🔄 Starting migration of existing URLs...');
    
    // Get all content with replicate.delivery URLs (using regular supabase client for DB)
    const { data: contents, error } = await supabaseStorage
      .from('content')
      .select('id, url, type, user_id')
      .like('url', '%replicate.delivery%');
    
    if (error) throw error;
    
    if (!contents || contents.length === 0) {
      console.log('✅ No URLs to migrate');
      return { success: true, migrated: 0 };
    }
    
    console.log(`📦 Found ${contents.length} URLs to migrate`);
    
    let migrated = 0;
    let failed = 0;
    
    for (const content of contents) {
      try {
        // Try to download and re-upload
        const result = await uploadFromUrl(content.url, content.type, content.user_id);
        
        if (result.success) {
          // Update database with new permanent URL
          const { error: updateError } = await supabaseStorage
            .from('content')
            .update({ url: result.url })
            .eq('id', content.id);
          
          if (updateError) {
            console.error(`Failed to update content ${content.id}:`, updateError);
            failed++;
          } else {
            migrated++;
            console.log(`✅ Migrated ${migrated}/${contents.length}`);
          }
        } else {
          console.error(`Failed to upload content ${content.id}:`, result.error);
          failed++;
        }
      } catch (err) {
        console.error(`Error migrating content ${content.id}:`, err);
        failed++;
      }
    }
    
    console.log(`✅ Migration complete: ${migrated} migrated, ${failed} failed`);
    
    return {
      success: true,
      total: contents.length,
      migrated: migrated,
      failed: failed
    };
    
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  initializeStorage,
  uploadFromUrl,
  deleteFile,
  migrateExistingUrls,
  BUCKET_NAME
};
