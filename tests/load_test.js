import http from 'k6/http';
import { check, sleep } from 'k6';

// Базовые настройки теста
export const options = {
  // Профиль нагрузки (Stages)
  stages: [
    { duration: '30s', target: 50 },  // Плавный разгон до 50 пользователей за 30 секунд
    { duration: '1m', target: 50 },   // Держим 50 пользователей в течение 1 минуты
    { duration: '30s', target: 200 }, // Резко увеличиваем до 200 пользователей
    { duration: '1m', target: 200 },  // Держим 200 пользователей
    { duration: '30s', target: 0 },   // Плавное завершение теста (до 0)
  ],
  // Пороги успешности (что считается провалом теста)
  thresholds: {
    http_req_failed: ['rate<0.01'], // Ошибок должно быть меньше 1%
    http_req_duration: ['p(95)<500'], // 95% запросов должны выполняться быстрее 500 мс
  },
};

// Целевой URL бэкенда (можно переопределить через переменную окружения)
// Пример запуска: k6 run -e TARGET_URL=https://api.tochilka.app/api load_test.js
const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:8090/api';

export default function () {
  // 1. Сценарий: проверка доступности (health check)
  // PocketBase имеет встроенный health эндпоинт
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Эмуляция паузы пользователя (думает перед следующим действием)
  sleep(1);

  // 2. Сценарий (опционально): Эмуляция авторизации и запроса данных
  // Раскомментируйте код ниже и укажите правильные данные для тестирования нагрузки на базу данных
  /*
  const authPayload = JSON.stringify({
    identity: 'test_user@example.com',
    password: 'password123',
  });
  const authParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Отправляем запрос на авторизацию
  const authRes = http.post(`${BASE_URL}/collections/users/auth-with-password`, authPayload, authParams);
  
  check(authRes, {
    'auth successful': (r) => r.status === 200,
  });
  
  // Если авторизация успешна, извлекаем токен и запрашиваем список занятий
  if (authRes.status === 200) {
    const token = authRes.json('token');
    
    // Эмуляция задержки перед загрузкой занятий
    sleep(2);
    
    // Получение расписания (замените 'lessons' на реальное название вашей коллекции занятий)
    const lessonsParams = {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    
    // Запрашиваем 50 последних записей
    const lessonsRes = http.get(`${BASE_URL}/collections/lessons/records?perPage=50`, lessonsParams);
    
    check(lessonsRes, {
      'fetched lessons': (r) => r.status === 200,
    });
  }
  */
  
  // Эмуляция времени, пока пользователь работает с приложением
  sleep(3);
}
