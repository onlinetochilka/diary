@echo off
echo ========================================================
echo   Деплой бота уведомлений (notifier-service)
echo ========================================================
echo.
echo SSH-ключ уже настроен, пароль не требуется.
echo.

echo [1/3] Загрузка файлов на сервер...
scp -r D:\daily\notifier-service\index.js D:\daily\notifier-service\db.js D:\daily\notifier-service\cron.js D:\daily\notifier-service\package.json D:\daily\notifier-service\package-lock.json root@5.35.89.238:/root/notifier-service/
scp -r D:\daily\notifier-service\providers\NotificationProvider.js D:\daily\notifier-service\providers\TelegramProvider.js D:\daily\notifier-service\providers\MaxProvider.js root@5.35.89.238:/root/notifier-service/providers/

if %ERRORLEVEL% NEQ 0 (
    echo ОШИБКА загрузки файлов! Проверьте SSH-ключ.
    pause
    exit /b 1
)
echo Файлы загружены.
echo.

echo [2/3] Установка зависимостей...
ssh root@5.35.89.238 "cd /root/notifier-service && npm install --production"
echo.

echo [3/3] Перезапуск бота...
ssh root@5.35.89.238 "pm2 restart notifier-service && pm2 logs notifier-service --lines 5 --nostream"
echo.

echo ========================================================
echo   Деплой завершён!
echo ========================================================
pause
