#!/usr/bin/env node

/**
 * Test Database Connection & Recent Records
 * 
 * Checks:
 * 1. Connection to Supabase
 * 2. Recent records in content_v3
 * 3. Records in session_ratings
 * 4. Records in user_insights
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🔍 Testing Database Connection...\n');
console.log('='.repeat(80));

async function testConnection() {
  try {
    // Test 1: Connection
    console.log('\n📡 Test 1: Connection to Supabase');
    const { data: testData, error: testError } = await supabase
      .from('content_v3')
      .select('id')
      .limit(1);
    if (testError) throw testError;
    console.log('✅ Connection successful\n');
    
    // Test 2: content_v3 recent records
    console.log('📊 Test 2: Recent records in content_v3');
    const { data: recentContent, error: contentError } = await supabase
      .from('content_v3')
      .select('id, created_at, agent_type, rating, comment')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (contentError) throw contentError;
    
    console.log(`   Total records fetched: ${recentContent?.length || 0}`);
    if (recentContent && recentContent.length > 0) {
      console.log('   Latest 5 records:');
      recentContent.slice(0, 5).forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.created_at} | ${r.agent_type} | Rating: ${r.rating || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️ No records found!');
    }
    
    // Test 3: content_v3 today's records
    console.log('\n📅 Test 3: Today\'s records (2025-12-09)');
    const { data: todayContent, error: todayError } = await supabase
      .from('content_v3')
      .select('id, created_at, agent_type')
      .gte('created_at', '2025-12-09T00:00:00')
      .order('created_at', { ascending: false });
    
    if (todayError) throw todayError;
    
    console.log(`   Records today: ${todayContent?.length || 0}`);
    if (todayContent && todayContent.length > 0) {
      console.log(`   First: ${todayContent[0].created_at}`);
      console.log(`   Last: ${todayContent[todayContent.length - 1].created_at}`);
    }
    
    // Test 4: session_ratings
    console.log('\n⭐ Test 4: session_ratings table');
    const { data: ratings, error: ratingsError } = await supabase
      .from('session_ratings')
      .select('session_id, content_id, rating, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ratingsError) {
      console.log('   ⚠️ Table may not exist or error:', ratingsError.message);
    } else {
      console.log(`   Total records: ${ratings?.length || 0}`);
      if (ratings && ratings.length > 0) {
        ratings.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.created_at} | Rating: ${r.rating}`);
        });
      }
    }
    
    // Test 5: user_insights
    console.log('\n💡 Test 5: user_insights table');
    const { data: insights, error: insightsError } = await supabase
      .from('user_insights')
      .select('session_id, loves, hates, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (insightsError) {
      console.log('   ⚠️ Table may not exist or error:', insightsError.message);
    } else {
      console.log(`   Total records: ${insights?.length || 0}`);
      if (insights && insights.length > 0) {
        insights.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.created_at}`);
          console.log(`      Loves: ${JSON.stringify(r.loves || [])}`);
          console.log(`      Hates: ${JSON.stringify(r.hates || [])}`);
        });
      }
    }
    
    // Test 6: Check if rating column exists
    console.log('\n🔍 Test 6: Check rating column in content_v3');
    const { data: withRating, error: ratingError } = await supabase
      .from('content_v3')
      .select('id, rating, comment, rated_at')
      .not('rating', 'is', null)
      .limit(5);
    
    if (ratingError) {
      console.log('   ⚠️ Rating column error:', ratingError.message);
    } else {
      console.log(`   Records with ratings: ${withRating?.length || 0}`);
      if (withRating && withRating.length > 0) {
        withRating.forEach((r, i) => {
          console.log(`   ${i + 1}. Rating: ${r.rating}, Comment: ${r.comment || 'N/A'}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Database tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConnection();
