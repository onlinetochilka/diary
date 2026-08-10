/// <reference path="../pb_data/types.d.ts" />

// Безопасное чтение переменных окружения (поддержка PB v0.22 и v0.23)
function getEnv(key) {
    try {
        if (typeof $os !== 'undefined' && $os.getenv) return $os.getenv(key);
        return require("os").getenv(key);
    } catch(e) {
        return "";
    }
}

const SHOP_ID = getEnv("YOOKASSA_SHOP_ID") || "1426992";
const SECRET_KEY = getEnv("YOOKASSA_SECRET_KEY") || "live_DaSWJMhDsMcltxFYB7lB7yP90prJuKGUkIpT_MokjtI";

if (!SECRET_KEY) {
    console.error("YOOKASSA_SECRET_KEY is not set in environment variables!");
}

const PLANS = {
    "monthly": { price: 390.00, months: 1, desc: "Подписка на 1 месяц" },
    "yearly": { price: 3490.00, months: 12, desc: "Подписка на 1 год" }
};

// 1. При регистрации нового пользователя автоматически даем 3 месяца подписки
onRecordAfterCreateRequest((e) => {
    const now = new Date();
    now.setMonth(now.getMonth() + 3);
    
    e.record.set("subscription_status", "active");
    e.record.set("subscription_until", now.toISOString().replace("T", " ").substring(0, 19) + "Z");
    
    try {
        e.app.save(e.record);
    } catch (err) {
        $app.dao().saveRecord(e.record);
    }
}, "users");


// 2. Роут для создания платежа (вызывается из React)
routerAdd("POST", "/api/payments/create", (c) => {
    // Проверяем авторизацию
    const admin = c.get("admin");
    const user = c.get("authRecord");
    
    if (!admin && !user) {
        c.json(401, { error: "Unauthorized" });
        return;
    }
    
    const userId = user ? user.get("id") : admin.get("id");
    
    // Читаем body
    let planKey = "";
    let returnUrl = "";

    try {
        // v0.23+ approach
        const data = $apis.requestInfo(c).data;
        planKey = data.plan;
        returnUrl = data.return_url;
    } catch(e) {
        // v0.22 approach
        try {
            const body = new DynamicModel({ plan: "", return_url: "" });
            c.bind(body);
            planKey = body.plan;
            returnUrl = body.return_url;
        } catch(e2) {
            c.json(400, { error: "Invalid body format" });
            return;
        }
    }

    if (!PLANS[planKey]) {
        c.json(400, { error: "Invalid plan" });
        return;
    }

    // 2. Формируем платеж
    const idempotenceKey = $security.randomString(32);
    const amount = PLANS[planKey].price.toFixed(2);
    const desc = PLANS[planKey].desc + " для " + user.get("email");

    const payload = {
        amount: {
            value: amount,
            currency: "RUB"
        },
        capture: true,
        confirmation: {
            type: "redirect",
            return_url: returnUrl
        },
        description: desc,
        metadata: {
            userId: user.getId(),
            plan: planKey
        }
    };

    const authHeader = "Basic " + $encoding.base64Encode(SHOP_ID + ":" + SECRET_KEY);

    try {
        // v0.23 uses require("http") or $http, we wrap in try-catch just in case
        let sendFunc = $http ? $http.send : require("http").send;
        if (!sendFunc) {
            c.json(500, { error: "HTTP client not available" });
            return;
        }

        const res = sendFunc({
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
            c.json(500, { error: "Payment gateway error" });
            return;
        }

        const paymentData = JSON.parse(res.raw);
        c.json(200, {
            payment_id: paymentData.id,
            confirmation_url: paymentData.confirmation.confirmation_url
        });
    } catch (err) {
        $app.logger().error("Yookassa API request failed", "error", String(err));
        c.json(500, { error: String(err) });
    }
});


// 3. Вебхук для ЮKassa
routerAdd("POST", "/api/payments/webhook", (c) => {
    // Читаем тело вебхука
    let payload;
    try {
        payload = $apis.requestInfo(c).data;
        if (!payload || !payload.event) {
            throw new Error("Empty payload");
        }
    } catch(e) {
        try {
            payload = JSON.parse(require("io/ioutil").readAll(c.request().body));
        } catch(e2) {
            return c.json(400, { error: "Invalid payload" });
        }
    }
    
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
            let userRecord;
            try {
                userRecord = $app.findRecordById("users", userId);
            } catch(err) {
                userRecord = $app.dao().findRecordById("users", userId);
            }
            
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
            
            try {
                $app.save(userRecord);
            } catch(err) {
                $app.dao().saveRecord(userRecord);
            }
            
            $app.logger().info("Subscription updated", "userId", userId, "plan", planKey);
            
        } catch (err) {
            $app.logger().error("Error processing webhook", "error", err.message);
            return c.json(500, { error: "Database error" });
        }
    }
    
    // Обязательно возвращаем 200 OK
    return c.json(200, { success: true });
});
