import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.POCKETBASE_URL || 'https://api.tochilka.app');
const testEmail = process.env.TEST_EMAIL || 'testuser_debug@example.com';
const testPassword = process.env.TEST_PASSWORD || 'TestPass123!';

// Try to create with already-existing email to reproduce the 400 error
try {
  await pb.collection('users').create({
    email: testEmail,
    password: testPassword,
    passwordConfirm: testPassword,
  });
} catch (err) {
  console.log('=== PocketBase SDK Error Structure ===');
  console.log('err.status:', err?.status);
  console.log('err.message:', err?.message);
  console.log('err.data (full):', JSON.stringify(err?.data, null, 2));
  console.log('err.data.data:', JSON.stringify(err?.data?.data, null, 2));
  console.log('err.response:', JSON.stringify(err?.response, null, 2));
  
  // Check what the current code does
  const fieldErrors = err?.data?.data || err?.response?.data || {};
  console.log('fieldErrors resolved to:', JSON.stringify(fieldErrors, null, 2));
  console.log('fieldErrors.email?.code:', fieldErrors?.email?.code);
}
