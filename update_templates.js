import PocketBase from 'pocketbase';

async function updateTemplates() {
  const pb = new PocketBase('https://api.tochilka.app');
  pb.autoCancellation(false);
  
  try {
    const authData = await pb.collection('_superusers').authWithPassword('yandji@mail.ru', 'y7F!TeQOvUFG');
    console.log('Login success!', authData.token ? 'Got token' : 'No token');
    
    const collection = await pb.collections.getOne('users');
    
    collection.passwordResetTemplate = {
      subject: 'Сброс пароля — Точилка',
      body: '<p>Здравствуйте,</p><p>Вы запросили сброс пароля для вашего аккаунта в приложении «Точилка».</p><p>Нажмите на кнопку ниже, чтобы задать новый пароль:</p><p><a href="{APP_URL}/login?token={TOKEN}" style="display:inline-block;background:#3b82f6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Сбросить пароль</a></p><p>Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p><p>С уважением,<br>Команда Точилки</p>'
    };
    
    collection.verificationTemplate = {
      subject: 'Подтверждение email — Точилка',
      body: '<p>Здравствуйте,</p><p>Спасибо за регистрацию в приложении «Точилка».</p><p>Пожалуйста, подтвердите ваш email, нажав на кнопку ниже:</p><p><a href="{APP_URL}/_/#/auth/confirm-verification/{TOKEN}" style="display:inline-block;background:#3b82f6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Подтвердить email</a></p><p>С уважением,<br>Команда Точилки</p>'
    };
    
    await pb.collections.update('users', collection);
    console.log('Templates updated successfully!');
  } catch(e) {
    console.error('Error details:', e.status, e.response);
  }
}

updateTemplates();
