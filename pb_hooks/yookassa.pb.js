/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
    const now = new Date();
    now.setMonth(now.getMonth() + 3);
    e.record.set("subscription_status", "active");
    e.record.set("subscription_until", now.toISOString().replace("T", " ").substring(0, 19) + "Z");
    e.next();
}, "users");

routerAdd("POST", "/api/payments/create", (c) => {
    let step = "init";
    try {
        let SHOP_ID = "1426992";
        let SECRET_KEY = "live_DaSWJMhDsMcltxFYB7lB7yP90prJuKGUkIpT_MokjtI";
        try {
            if (typeof $os !== 'undefined' && typeof $os.getenv === 'function') {
                SHOP_ID = $os.getenv("YOOKASSA_SHOP_ID") || SHOP_ID;
                SECRET_KEY = $os.getenv("YOOKASSA_SECRET_KEY") || SECRET_KEY;
            }
        } catch(e) {}

        const PLANS = {
            "monthly": { price: 390.00, months: 1, desc: "Подписка на 1 месяц" },
            "yearly": { price: 3490.00, months: 12, desc: "Подписка на 1 год" }
        };

        step = "auth_check";
        let userId = null;
        let userEmail = "";
        
        if (c.auth) {
            userId = c.auth.id;
            userEmail = c.auth.get("email");
        } else {
            return c.json(401, { error: "Unauthorized" });
        }
        
        step = "read_body";
        const body = new DynamicModel({ plan: "", return_url: "" });
        c.bindBody(body);

        const planKey = body.plan;
        const returnUrl = body.return_url;

        step = "validate_plan";
        if (!planKey || !PLANS[planKey]) {
            return c.json(400, { error: "Invalid plan: " + String(planKey) });
        }

        step = "prepare_payload";
        let idempotenceKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
        try {
            if (typeof $security !== "undefined" && typeof $security.randomString === "function") {
                idempotenceKey = $security.randomString(32);
            }
        } catch(e) {}
        
        const amount = PLANS[planKey].price.toFixed(2);
        const desc = PLANS[planKey].desc + " для " + userEmail;

        const payload = {
            amount: { value: amount, currency: "RUB" },
            capture: true,
            confirmation: { type: "redirect", return_url: returnUrl },
            description: desc,
            metadata: { userId: userId, plan: planKey }
        };

        step = "base64_encode";
        function b64Encode(str) {
            let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            let encoded = '';
            for (let i = 0; i < str.length; ) {
                let c1 = str.charCodeAt(i++), c2 = str.charCodeAt(i++), c3 = str.charCodeAt(i++);
                encoded += chars[c1 >> 2] + chars[((c1 & 3) << 4) | ((c2 || 0) >> 4)] + 
                           (isNaN(c2) ? '=' : chars[((c2 & 15) << 2) | ((c3 || 0) >> 6)]) + 
                           (isNaN(c3) ? '=' : chars[c3 & 63]);
            }
            return encoded;
        }
        const authHeader = "Basic " + b64Encode(SHOP_ID + ":" + SECRET_KEY);

        step = "send_http";
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

        step = "handle_response";
        const statusCode = res.statusCode || res.status;
        if (statusCode >= 400) {
            $app.logger().error("Yookassa create payment error", "response", res.raw);
            return c.json(500, { error: "Payment gateway error: " + res.raw });
        }

        const paymentData = JSON.parse(res.raw);
        return c.json(200, {
            payment_id: paymentData.id,
            confirmation_url: paymentData.confirmation.confirmation_url
        });
    } catch (err) {
        $app.logger().error("Create payment exception", "step", step, "error", String(err));
        return c.json(400, { 
            error: "Exception occurred", 
            message: String(err),
            step: step
        });
    }
});

routerAdd("POST", "/api/payments/webhook", (c) => {
    let step = "init";
    try {
        const PLANS = {
            "monthly": { price: 390.00, months: 1, desc: "Подписка на 1 месяц" },
            "yearly": { price: 3490.00, months: 12, desc: "Подписка на 1 год" }
        };

        step = "read_body";
        const body = new DynamicModel({ event: "", object: "" });
        c.bindBody(body);

        const event = body.event;
        const payment = typeof body.object === "string"
            ? JSON.parse(body.object)
            : body.object;

        if (!event) {
            return c.json(400, { error: "Empty payload" });
        }
        
        if (event === "payment.succeeded") {
            step = "process_payment";
            const userId = payment.metadata.userId;
            const planKey = payment.metadata.plan;
            
            if (!userId || !planKey || !PLANS[planKey]) {
                return c.json(400, { error: "Invalid metadata" });
            }
            
            step = "update_user";
            const userRecord = $app.findRecordById("users", userId);
            
            let currentValidUntil = userRecord.get("subscription_until");
            let dateObj = new Date();
            if (currentValidUntil) {
                const currentObj = new Date(currentValidUntil.replace(" ", "T"));
                if (currentObj > dateObj) {
                    dateObj = currentObj;
                }
            }
            dateObj.setMonth(dateObj.getMonth() + PLANS[planKey].months);
            
            userRecord.set("subscription_status", "active");
            userRecord.set("subscription_until", dateObj.toISOString().replace("T", " ").substring(0, 19) + "Z");
            userRecord.set("yookassa_payment_id", payment.id);
            
            $app.save(userRecord);
        }
        return c.json(200, { success: true });
    } catch (err) {
        $app.logger().error("Webhook exception", "step", step, "error", String(err));
        return c.json(400, { error: String(err), step: step });
    }
});
