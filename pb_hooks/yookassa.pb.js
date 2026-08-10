/// <reference path="../pb_data/types.d.ts" />

// ВНИМАНИЕ: Замените эти значения на ваши реальные данные из личного кабинета ЮKassa
const SHOP_ID = "1426992";
const SECRET_KEY = "live_DaSWJMhDsMcltxFYB7lB7yP90prJuKGUkIpT_MokjtI";

const PLANS = {
    "monthly": { price: 390.00, months: 1, desc: "Подписка на 1 месяц" },
    "yearly": { price: 3490.00, months: 12, desc: "Подписка на 1 год" }
};

// 1. При регистрации нового пользователя автоматически даем 3 месяца подписки
onRecordAfterCreateRequest((e) => {
    // Получаем текущую дату
    const now = new Date();
    // Прибавляем 3 месяца
    now.setMonth(now.getMonth() + 3);
    
    // Обновляем запись
    e.record.set("subscription_status", "active");
    // Форматируем дату для PocketBase (Y-m-d H:i:s.SZ)
    e.record.set("subscription_until", now.toISOString().replace("T", " ").substring(0, 19) + "Z");
    
    $app.dao().saveRecord(e.record);
}, "users");


// 2. Роут для создания платежа (вызывается из React)
routerAdd("POST", "/api/payments/create", (c) => {
    // Проверяем авторизацию
    const admin = c.get("admin");
    const user = c.get("authRecord");
    
    if (!admin && !user) {
        throw new require("echo").HTTPError(401, "Unauthorized");
    }
    
    const userId = user ? user.get("id") : admin.get("id");
    
    // Читаем body
    const body = new DynamicModel({
        plan: "",
        return_url: ""
    });
    c.bind(body);

    const planKey = body.plan;
    const returnUrl = body.return_url || "https://your-domain.ru/billing";
    
    if (!PLANS[planKey]) {
        throw new require("echo").HTTPError(400, "Invalid plan");
    }
    
    const plan = PLANS[planKey];
    
    // Вызываем API ЮKassa
    const authHeader = "Basic " + $security.encodeBase64(SHOP_ID + ":" + SECRET_KEY);
    const idempotenceKey = $security.randomString(16);
    
    const payload = {
        amount: {
            value: plan.price.toFixed(2),
            currency: "RUB"
        },
        capture: true, // автоматическое подтверждение (снятие денег)
        confirmation: {
            type: "redirect",
            return_url: returnUrl
        },
        description: plan.desc,
        metadata: {
            userId: userId,
            plan: planKey
        }
    };

    const res = $http.send({
        url: "https://api.yookassa.ru/v3/payments",
        method: "POST",
        headers: {
            "Authorization": authHeader,
            "Idempotence-Key": idempotenceKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    
    if (res.statusCode >= 400) {
        $app.logger().error("Yookassa create payment error", "response", res.raw);
        throw new require("echo").HTTPError(500, "Payment gateway error");
    }
    
    const yookassaResponse = JSON.parse(res.raw);
    
    return c.json(200, {
        confirmation_url: yookassaResponse.confirmation.confirmation_url,
        payment_id: yookassaResponse.id
    });
});


// 3. Вебхук для ЮKassa
routerAdd("POST", "/api/payments/webhook", (c) => {
    // Читаем тело вебхука
    const payload = JSON.parse(require("io/ioutil").readAll(c.request().body));
    
    if (payload.event === "payment.succeeded") {
        const payment = payload.object;
        const userId = payment.metadata.userId;
        const planKey = payment.metadata.plan;
        
        if (!userId || !planKey || !PLANS[planKey]) {
            return c.json(400, { error: "Invalid metadata" });
        }
        
        const plan = PLANS[planKey];
        
        try {
            // Находим пользователя в базе
            const userRecord = $app.dao().findRecordById("users", userId);
            
            // Вычисляем новую дату окончания подписки
            let currentValidUntil = userRecord.get("subscription_until");
            let dateObj = new Date(); // по умолчанию отсчет от сегодня
            
            if (currentValidUntil) {
                // Если подписка еще активна, добавляем к ней
                const currentObj = new Date(currentValidUntil.replace(" ", "T"));
                if (currentObj > dateObj) {
                    dateObj = currentObj;
                }
            }
            
            dateObj.setMonth(dateObj.getMonth() + plan.months);
            
            // Обновляем пользователя
            userRecord.set("subscription_status", "active");
            userRecord.set("subscription_until", dateObj.toISOString().replace("T", " ").substring(0, 19) + "Z");
            userRecord.set("yookassa_payment_id", payment.id);
            
            $app.dao().saveRecord(userRecord);
            
            $app.logger().info("Subscription updated", "userId", userId, "plan", planKey);
            
        } catch (err) {
            $app.logger().error("Error processing webhook", "error", err.message);
            return c.json(500, { error: "Database error" });
        }
    }
    
    // Обязательно возвращаем 200 OK
    return c.json(200, { success: true });
});
