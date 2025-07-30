#!/usr/bin/env node

/**
 * Simple AntiGoldfishMode License Key Generator
 * Usage: node generate-license.js [type] [count]
 * Types: EARLY, STD, TRIAL
 */

function generateLicenseKey(type = 'EARLY') {
  const part = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AGM-${type}-${part()}-${part()}-${part()}`;
}

function generateMultipleLicenses(type, count) {
  const licenses = [];
  for (let i = 0; i < count; i++) {
    licenses.push(generateLicenseKey(type));
  }
  return licenses;
}

// Parse command line arguments
const args = process.argv.slice(2);
const type = args[0] || 'EARLY';
const count = parseInt(args[1]) || 1;

// Validate type
const validTypes = ['EARLY', 'STD', 'TRIAL'];
if (!validTypes.includes(type.toUpperCase())) {
  console.error('❌ Invalid license type. Valid types: EARLY, STD, TRIAL');
  process.exit(1);
}

// Validate count
if (count < 1 || count > 100) {
  console.error('❌ Count must be between 1 and 100');
  process.exit(1);
}

// Generate licenses
console.log(`🔑 Generating ${count} ${type.toUpperCase()} license key(s):\n`);

const licenses = generateMultipleLicenses(type.toUpperCase(), count);
licenses.forEach((license, index) => {
  console.log(`${index + 1}. ${license}`);
});

console.log(`\n✅ Generated ${count} license key(s) successfully!`);

// Usage examples
if (count === 1 && type.toUpperCase() === 'EARLY') {
  console.log('\n📋 Usage Examples:');
  console.log('node generate-license.js EARLY 5    # Generate 5 early adopter keys ($69/year)');
  console.log('node generate-license.js STD 10     # Generate 10 standard keys ($149/year)');
  console.log('node generate-license.js TRIAL 3    # Generate 3 trial keys (free)');
  console.log('\n💰 Pricing:');
  console.log('Early Adopter: $69/year (limited to first 20,000 licenses)');
  console.log('Standard: $149/year (after early adopter sold out)');
}
