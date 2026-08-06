import PocketBase from '../node_modules/pocketbase/dist/pocketbase.es.mjs';
const pb = new PocketBase(process.env.POCKETBASE_URL || 'https://api.tochilka.app');
const email = process.env.TEST_EMAIL || 'debugtest2_xyz@tochilka.app';
const password = process.env.TEST_PASSWORD || 'Demo_abc1234!1';
await pb.collection('users').authWithPassword(email, password);
const uid = pb.authStore.record.id;
console.log('Auth OK, uid:', uid);

const tests = [
  ['students', () => pb.collection('students').getFullList({ filter: 'tutorId = "' + uid + '"' })],
  ['groups', () => pb.collection('groups').getFullList({ filter: 'tutorId = "' + uid + '"' })],
  ['lessons', () => pb.collection('lessons').getFullList({ filter: 'tutorId = "' + uid + '"' })],
  ['payments', () => pb.collection('payments').getFullList({ filter: 'tutorId = "' + uid + '"' })],
  ['programs', () => pb.collection('programs').getFullList({ filter: 'tutorId = "' + uid + '"' })],
  ['user_config', () => pb.collection('user_config').getFullList({ filter: 'userId = "' + uid + '"' })],
  ['community_news', () => pb.collection('community_news').getList(1, 1, {})],
];

for (const [name, fn] of tests) {
  try {
    const res = await fn();
    console.log(name + ': OK (' + (Array.isArray(res) ? res.length : res.totalItems) + ')');
  } catch(e) {
    console.error(name + ': FAIL ' + e.status + ' -- ' + e.message);
  }
}
