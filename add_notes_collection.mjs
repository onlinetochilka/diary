import PocketBase from 'pocketbase';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("✏️ Скрипт создания коллекции 'daily_notes' в PocketBase");
  
  // URL сервера (по умолчанию локальный)
  const pbUrl = await question("URL сервера PocketBase (Enter для http://127.0.0.1:8090): ");
  const url = pbUrl.trim() || "http://127.0.0.1:8090";
  
  const pb = new PocketBase(url);

  const email = await question("Email администратора PB: ");
  const password = await question("Пароль администратора PB: ");

  try {
    console.log("Авторизация...");
    await pb.admins.authWithPassword(email.trim(), password.trim());
    console.log("✅ Успешно авторизовано!");

    // Создаем схему коллекции
    const collectionData = {
      name: "daily_notes",
      type: "base",
      system: false,
      schema: [
        {
          system: false,
          id: "field_date",
          name: "date",
          type: "text",
          required: true,
          options: {
            min: null,
            max: null,
            pattern: ""
          }
        },
        {
          system: false,
          id: "field_color",
          name: "color",
          type: "text",
          required: false,
          options: {
            min: null,
            max: null,
            pattern: ""
          }
        },
        {
          system: false,
          id: "field_items",
          name: "items",
          type: "json",
          required: true,
          options: {}
        },
        {
          system: false,
          id: "field_user",
          name: "userId",
          type: "relation",
          required: true,
          options: {
            collectionId: "systemprofiles0", // Заглушка
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1,
            displayFields: []
          }
        }
      ],
      listRule: "userId = @request.auth.id",
      viewRule: "userId = @request.auth.id",
      createRule: "userId = @request.auth.id",
      updateRule: "userId = @request.auth.id",
      deleteRule: "userId = @request.auth.id",
    };

    console.log("Получаю ID коллекции пользователей...");
    const usersCollection = await pb.collections.getOne("users");
    collectionData.schema[3].options.collectionId = usersCollection.id;

    console.log("Создаю коллекцию daily_notes...");
    const created = await pb.collections.create(collectionData);
    
    console.log("🎉 Коллекция 'daily_notes' успешно создана!");
    console.log("ID:", created.id);
  } catch (err) {
    console.error("❌ Ошибка:", err.message);
    if (err.response) {
      console.error(JSON.stringify(err.response, null, 2));
    }
  } finally {
    rl.close();
  }
}

main();
