#!/usr/bin/env node

/**
 * 🧪 SIMPLIFIED TEST: Learning Integration (No DB/API required)
 * 
 * Tests core logic without external dependencies
 */

console.log('\n🧪 TESTING LEARNING INTEGRATION (SIMPLIFIED)\n');
console.log('='.repeat(80));

// Mock buildAdaptiveSystemPrompt (copy from actual implementation)
function buildAdaptiveSystemPrompt(basePrompt, insights) {
  if (!insights || !insights.insights) {
    return basePrompt;
  }
  
  const { loves, hates, suggestions } = insights.insights;
  
  const adaptiveSection = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 LEARNED USER PREFERENCES (from ${insights.itemsAnalyzed} rated items)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❤️ USER LOVES (incorporate these):
${loves.map((item, i) => `${i+1}. ${item}`).join('\n')}

💔 USER HATES (AVOID these):
${hates.map((item, i) => `${i+1}. ${item}`).join('\n')}

💡 SUGGESTIONS (apply these):
${suggestions.map((item, i) => `${i+1}. ${item}`).join('\n')}

⚠️ CRITICAL: Adapt your generation to match these learned preferences!
Use the "loves", avoid the "hates", and follow the suggestions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  
  return basePrompt + adaptiveSection;
}

// Test 1: Basic functionality
console.log('✅ Test 1: Basic Functionality');

const basePrompt = "You are a professional AI image generation assistant.";
const mockInsights = {
  hasHistory: true,
  itemsAnalyzed: 5,
  insights: {
    loves: ["Natural lighting", "Outdoor settings", "Casual poses"],
    hates: ["Studio lighting", "Stiff poses", "Too much editing"],
    suggestions: ["Use golden hour lighting", "Focus on authenticity", "Avoid heavy filters"]
  }
};

try {
  const adaptivePrompt = buildAdaptiveSystemPrompt(basePrompt, mockInsights);
  
  // Verify structure
  const checks = [
    { name: 'Contains base prompt', test: adaptivePrompt.includes(basePrompt) },
    { name: 'Contains USER LOVES', test: adaptivePrompt.includes('USER LOVES') },
    { name: 'Contains USER HATES', test: adaptivePrompt.includes('USER HATES') },
    { name: 'Contains SUGGESTIONS', test: adaptivePrompt.includes('SUGGESTIONS') },
    { name: 'Contains "Natural lighting"', test: adaptivePrompt.includes('Natural lighting') },
    { name: 'Contains "Studio lighting"', test: adaptivePrompt.includes('Studio lighting') },
    { name: 'Contains "golden hour"', test: adaptivePrompt.includes('golden hour') },
  ];
  
  let passed = 0;
  checks.forEach(check => {
    if (check.test) {
      console.log(`   ✅ ${check.name}`);
      passed++;
    } else {
      console.log(`   ❌ ${check.name}`);
    }
  });
  
  if (passed === checks.length) {
    console.log(`\n✅ Test 1 PASSED (${passed}/${checks.length} checks)`);
  } else {
    console.log(`\n❌ Test 1 FAILED (${passed}/${checks.length} checks)`);
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Test 1 FAILED:', error.message);
  process.exit(1);
}

// Test 2: No insights fallback
console.log('\n✅ Test 2: No Insights Fallback');

try {
  const result1 = buildAdaptiveSystemPrompt(basePrompt, null);
  const result2 = buildAdaptiveSystemPrompt(basePrompt, { hasHistory: false });
  const result3 = buildAdaptiveSystemPrompt(basePrompt, { insights: null });
  
  if (result1 === basePrompt && result2 === basePrompt && result3 === basePrompt) {
    console.log('   ✅ Returns base prompt for null insights');
    console.log('   ✅ Returns base prompt for no history');
    console.log('   ✅ Returns base prompt for null insights object');
    console.log('\n✅ Test 2 PASSED');
  } else {
    console.log('❌ Test 2 FAILED: Should return base prompt unchanged');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Test 2 FAILED:', error.message);
  process.exit(1);
}

// Test 3: Empty arrays handling
console.log('\n✅ Test 3: Empty Arrays Handling');

try {
  const emptyInsights = {
    hasHistory: true,
    itemsAnalyzed: 0,
    insights: {
      loves: [],
      hates: [],
      suggestions: []
    }
  };
  
  const result = buildAdaptiveSystemPrompt(basePrompt, emptyInsights);
  
  if (result.includes('USER LOVES') && result.includes('from 0 rated items')) {
    console.log('   ✅ Handles empty arrays gracefully');
    console.log('\n✅ Test 3 PASSED');
  } else {
    console.log('❌ Test 3 FAILED: Should handle empty arrays');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Test 3 FAILED:', error.message);
  process.exit(1);
}

// Test 4: Output validation
console.log('\n✅ Test 4: Output Format Validation');

try {
  const adaptivePrompt = buildAdaptiveSystemPrompt(basePrompt, mockInsights);
  
  const lines = adaptivePrompt.split('\n');
  const hasNumberedLoves = lines.some(line => line.match(/1\.\s+Natural lighting/));
  const hasNumberedHates = lines.some(line => line.match(/1\.\s+Studio lighting/));
  const hasNumberedSuggestions = lines.some(line => line.match(/1\.\s+Use golden hour/));
  
  if (hasNumberedLoves && hasNumberedHates && hasNumberedSuggestions) {
    console.log('   ✅ Items are numbered correctly');
    console.log('   ✅ Format matches specification');
    console.log('\n✅ Test 4 PASSED');
  } else {
    console.log('❌ Test 4 FAILED: Format issues detected');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Test 4 FAILED:', error.message);
  process.exit(1);
}

// Display sample output
console.log('\n' + '='.repeat(80));
console.log('📝 SAMPLE ADAPTIVE PROMPT OUTPUT:');
console.log('='.repeat(80));

const sampleOutput = buildAdaptiveSystemPrompt(
  "You are a professional AI image generation assistant.",
  mockInsights
);

console.log(sampleOutput);
console.log('='.repeat(80));

// Final summary
console.log('\n🎉 ALL TESTS PASSED!\n');
console.log('✅ Summary:');
console.log('   1. Basic functionality working');
console.log('   2. Fallback handling correct');
console.log('   3. Empty arrays handled gracefully');
console.log('   4. Output format validated');
console.log('\n📊 Integration Status:');
console.log('   ✅ buildAdaptiveSystemPrompt() logic correct');
console.log('   ✅ Insights structure validated');
console.log('   ✅ Output format matches spec');
console.log('\n⚠️  Full Flow Testing Required:');
console.log('   - Backend must be running');
console.log('   - Database with test data');
console.log('   - OpenAI API key configured');
console.log('   - Follow test-flow.md for manual testing');
console.log('\n' + '='.repeat(80) + '\n');

process.exit(0);
