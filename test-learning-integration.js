#!/usr/bin/env node

/**
 * 🧪 AUTOMATED TEST: Learning Integration
 * 
 * Tests that comment-based learning is properly integrated
 * into the generation flow.
 */

import { analyzeSessionHistory, buildAdaptiveSystemPrompt } from './backend/src/services/adaptive-learning.service.js';

console.log('\n🧪 TESTING LEARNING INTEGRATION\n');
console.log('='.repeat(80));

// Test 1: Module imports
console.log('\n✅ Test 1: Module Imports');
console.log('   - analyzeSessionHistory:', typeof analyzeSessionHistory);
console.log('   - buildAdaptiveSystemPrompt:', typeof buildAdaptiveSystemPrompt);

if (typeof analyzeSessionHistory !== 'function') {
  console.error('❌ FAIL: analyzeSessionHistory not a function');
  process.exit(1);
}

if (typeof buildAdaptiveSystemPrompt !== 'function') {
  console.error('❌ FAIL: buildAdaptiveSystemPrompt not a function');
  process.exit(1);
}

console.log('✅ All imports successful');

// Test 2: buildAdaptiveSystemPrompt() logic
console.log('\n✅ Test 2: buildAdaptiveSystemPrompt() Logic');

const basePrompt = "You are a helpful AI assistant.";
const mockInsights = {
  hasHistory: true,
  itemsAnalyzed: 5,
  insights: {
    loves: ["Natural lighting", "Outdoor settings", "Casual poses"],
    hates: ["Studio lighting", "Stiff poses", "Too much editing"],
    suggestions: ["Use golden hour lighting", "Focus on authenticity", "Avoid heavy filters"]
  }
};

const adaptivePrompt = buildAdaptiveSystemPrompt(basePrompt, mockInsights);

// Verify adaptive section was added
if (!adaptivePrompt.includes('USER LOVES')) {
  console.error('❌ FAIL: Adaptive prompt missing USER LOVES section');
  process.exit(1);
}

if (!adaptivePrompt.includes('USER HATES')) {
  console.error('❌ FAIL: Adaptive prompt missing USER HATES section');
  process.exit(1);
}

if (!adaptivePrompt.includes('Natural lighting')) {
  console.error('❌ FAIL: Adaptive prompt missing specific love item');
  process.exit(1);
}

if (!adaptivePrompt.includes('Studio lighting')) {
  console.error('❌ FAIL: Adaptive prompt missing specific hate item');
  process.exit(1);
}

console.log('✅ Adaptive prompt built correctly');
console.log('\n📝 Sample Output (first 300 chars):');
console.log(adaptivePrompt.substring(0, 300) + '...\n');

// Test 3: Verify no insights case
console.log('✅ Test 3: No Insights Fallback');
const noInsightsPrompt = buildAdaptiveSystemPrompt(basePrompt, null);

if (noInsightsPrompt !== basePrompt) {
  console.error('❌ FAIL: Should return base prompt when no insights');
  process.exit(1);
}

console.log('✅ Correctly returns base prompt when no insights');

// Test 4: Verify empty insights case
console.log('\n✅ Test 4: Empty Insights Handling');
const emptyInsights = {
  hasHistory: false,
  itemsAnalyzed: 0,
  insights: null
};

const emptyPrompt = buildAdaptiveSystemPrompt(basePrompt, emptyInsights);
if (emptyPrompt !== basePrompt) {
  console.error('❌ FAIL: Should return base prompt for empty insights');
  process.exit(1);
}

console.log('✅ Correctly handles empty insights');

// Summary
console.log('\n' + '='.repeat(80));
console.log('🎉 ALL TESTS PASSED!');
console.log('='.repeat(80));
console.log('\n✅ Learning integration is working correctly:');
console.log('   1. Modules import successfully');
console.log('   2. buildAdaptiveSystemPrompt() builds adaptive prompts');
console.log('   3. Fallback to base prompt when no insights');
console.log('   4. Handles empty insights gracefully');
console.log('\n⚠️  NOTE: Full integration test requires:');
console.log('   - Live database connection');
console.log('   - OpenAI API key');
console.log('   - Actual session with rated content');
console.log('\n📖 See test-flow.md for manual testing steps');
console.log('='.repeat(80) + '\n');

process.exit(0);
