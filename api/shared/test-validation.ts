/**
 * Test script to demonstrate input validation
 * Run with: bun run api/shared/test-validation.ts
 */

import {
  validateBucketName,
  validateObjectKey,
  validateSessionId,
  validateAnnotationId,
  validateSQLQuery,
  validateDatabaseId,
  validateContentLength,
} from './validation';

console.log('🔒 Testing Input Validation\n');

// Test 1: Bucket Name Validation
console.log('1. Bucket Name Validation:');
try {
  validateBucketName('my-bucket');
  console.log('  ✅ Valid bucket name accepted');
} catch (e: any) {
  console.log('  ❌ Should have accepted valid bucket name');
}

try {
  validateBucketName('../etc/passwd');
  console.log('  ❌ Should have rejected path traversal');
} catch (e: any) {
  console.log('  ✅ Path traversal blocked:', e.message);
}

// Test 2: Object Key Validation
console.log('\n2. Object Key Validation:');
try {
  validateObjectKey('documents/file.txt');
  console.log('  ✅ Valid key accepted');
} catch (e: any) {
  console.log('  ❌ Should have accepted valid key');
}

try {
  validateObjectKey('../../secret');
  console.log('  ❌ Should have rejected path traversal');
} catch (e: any) {
  console.log('  ✅ Path traversal blocked:', e.message);
}

// Test 3: SQL Query Validation
console.log('\n3. SQL Query Validation:');
try {
  validateSQLQuery('SELECT * FROM users WHERE id = ?');
  console.log('  ✅ Valid query accepted');
} catch (e: any) {
  console.log('  ❌ Should have accepted valid query');
}

try {
  validateSQLQuery('SELECT * FROM users; DROP TABLE users;');
  console.log('  ❌ Should have rejected SQL injection');
} catch (e: any) {
  console.log('  ✅ SQL injection blocked:', e.message);
}

// Test 4: Content Length Validation
console.log('\n4. Content Length Validation:');
try {
  validateContentLength('Normal content');
  console.log('  ✅ Normal content accepted');
} catch (e: any) {
  console.log('  ❌ Should have accepted normal content');
}

try {
  const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
  validateContentLength(largeContent);
  console.log('  ❌ Should have rejected oversized content');
} catch (e: any) {
  console.log('  ✅ Oversized content blocked:', e.message);
}

// Test 5: Session ID Validation
console.log('\n5. Session ID Validation:');
try {
  validateSessionId('session_12345');
  console.log('  ✅ Valid session ID accepted');
} catch (e: any) {
  console.log('  ❌ Should have accepted valid session ID');
}

try {
  validateSessionId('');
  console.log('  ❌ Should have rejected empty session ID');
} catch (e: any) {
  console.log('  ✅ Empty session ID blocked:', e.message);
}

// Test 6: Database ID Validation
console.log('\n6. Database ID Validation:');
try {
  validateDatabaseId('analytics-db');
  console.log('  ✅ Valid database ID accepted');
} catch (e: any) {
  console.log('  ❌ Should have accepted valid database ID');
}

try {
  validateDatabaseId('../../../secrets');
  console.log('  ❌ Should have rejected path traversal');
} catch (e: any) {
  console.log('  ✅ Path traversal blocked:', e.message);
}

console.log('\n✅ All validation tests completed!');
