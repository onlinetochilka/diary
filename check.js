const token = "8877877710:AAGfnHb7Tfiv77DOcrTWjpEBsFDOiGco8nM";
const channel = "tochilka_online";

async function run() {
  console.log("Fetching from telegram...");
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?allowed_updates=["channel_post"]&limit=100`);
  const json = await res.json();
  console.log("Result:", JSON.stringify(json, null, 2));
}

run().catch(console.error);
