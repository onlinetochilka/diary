import PocketBase from 'pocketbase';

async function main() {
  const pb = new PocketBase('https://api.tochilka.app');
  await pb.admins.authWithPassword('admin@tochilka.app', '3SenSay!');
  
  try {
    const logs = await pb.logs.getRequestsList(1, 10, {
        sort: '-created',
        filter: 'method = "POST" && url = "/api/payments/create"'
    });
    console.log(JSON.stringify(logs.items.map(l => ({
      status: l.status,
      message: l.message,
      error: l.error,
      data: l.meta
    })), null, 2));
  } catch(e) {
      console.log(e);
  }
}
main();
