-- =====================================================
-- REMOVE LEGACY TABLES (V2 → V3 Migration Cleanup)
-- =====================================================
-- This script removes legacy tables that are no longer used in V3
-- Run this ONLY if you're sure you don't need V2 compatibility

-- ⚠️ WARNING: This will DELETE data!
-- Make backups if needed before running

-- =====================================================
-- 1. REMOVE prompt_templates (LEGACY)
-- =====================================================
-- Used in V2 for static prompt templates
-- V3 uses agent_configs with weighted learning instead

-- Check what will be deleted
SELECT 
  COUNT(*) as total_templates,
  string_agg(name, ', ') as template_names
FROM prompt_templates;

-- Drop the table (UNCOMMENT TO EXECUTE)
-- DROP TABLE IF EXISTS prompt_templates CASCADE;

COMMENT ON DATABASE CURRENT_DATABASE IS 'Legacy prompt_templates removed - using agent_configs for V3';

-- =====================================================
-- 2. REMOVE ratings (LEGACY - optional)
-- =====================================================
-- Old SwipePage ratings table
-- V3 uses content_v3.rating + session_ratings for AI learning

-- Check what will be deleted
SELECT 
  COUNT(*) as total_ratings,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as oldest_rating,
  MAX(created_at) as newest_rating
FROM ratings;

-- Drop the table (UNCOMMENT TO EXECUTE)
-- DROP TABLE IF EXISTS ratings CASCADE;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check remaining tables
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify V3 tables exist
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'agent_configs') 
    THEN '✅ agent_configs' 
    ELSE '❌ agent_configs MISSING!' 
  END as agent_configs_status,
  
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'weight_parameters') 
    THEN '✅ weight_parameters' 
    ELSE '❌ weight_parameters MISSING!' 
  END as weights_status,
  
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'session_ratings') 
    THEN '✅ session_ratings' 
    ELSE '❌ session_ratings MISSING!' 
  END as session_ratings_status,
  
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'content_v3') 
    THEN '✅ content_v3' 
    ELSE '❌ content_v3 MISSING!' 
  END as content_status;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- If you accidentally deleted and need to restore:
-- 1. Restore from backup
-- 2. Or re-run FINAL_MIGRATION.sql to recreate tables
-- 3. Re-seed with agent_configs data





