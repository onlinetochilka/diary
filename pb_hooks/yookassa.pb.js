/// <reference path="../pb_data/types.d.ts" />

if (typeof onRecordCreateRequest !== "undefined") {
    onRecordCreateRequest((e) => {
        const now = new Date();
        now.setMonth(now.getMonth() + 3);
        e.record.set("subscription_status", "active");
        e.record.set("subscription_until", now.toISOString().replace("T", " ").substring(0, 19) + "Z");
        e.next();
    }, "users");
} else if (typeof onRecordAfterCreateRequest !== "undefined") {
    onRecordAfterCreateRequest((e) => {
        const now = new Date();
        now.setMonth(now.getMonth() + 3);
        e.record.set("subscription_status", "active");
        e.record.set("subscription_until", now.toISOString().replace("T", " ").substring(0, 19) + "Z");
        try { e.app.save(e.record); } catch (err) { $app.dao().saveRecord(e.record); }
    }, "users");
}

routerAdd("POST", "/api/payments/create", (c) => {
    let step = "init";
    try {
        let SHOP_ID = "1426992";
        let SECRET_KEY = "live_DaSWJMhDsMcltxFYB7lB7yP90prJuKGUkIpT_MokjtI";
        try {
            if (typeof $os !== 'undefined' && typeof $os.getenv === 'function') {
                SHOP_ID = $os.getenv("YOOKASSA_SHOP_ID") || SHOP_ID;
                SECRET_KEY = $os.getenv("YOOKASSA_SECRET_KEY") || SECRET_KEY;
            } else if (typeof require !== 'undefined') {
                let os = require("os");
                if (os && typeof os.getenv === 'function') {
                    SHOP_ID = os.getenv("YOOKASSA_SHOP_ID") || SHOP_ID;
                    SECRET_KEY = os.getenv("YOOKASSA_SECRET_KEY") || SECRET_KEY;
                }
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
            const admin = typeof c.get === "function" ? c.get("admin") : null;
            const user = typeof c.get === "function" ? c.get("authRecord") : null;
            if (admin) {
                userId = admin.get("id");
                userEmail = admin.get("email");
            } else if (user) {
                userId = user.get("id");
                userEmail = user.get("email");
            } else {
                return c.json(401, { error: "Unauthorized" });
            }
        }
        
        step = "read_body";
        const body = new DynamicModel({ plan: "", return_url: "" });
        if (typeof c.bind === "function") {
            c.bind(body);
        } else if (typeof c.bindBody === "function") {
            c.bindBody(body);
        } else {
            let data;
            if (typeof c.requestInfo === "function") {
                data = c.requestInfo().body;
            } else {
                data = $apis.requestInfo(c).data;
            }
            body.plan = data.plan;
            body.return_url = data.return_url;
        }

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
        let sendFunc = typeof $http !== "undefined" ? $http.send : require("http").send;
        if (!sendFunc) {
            return c.json(500, { error: "HTTP client not available" });
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
        let payload;
        if (typeof c.bind === "function") {
            payload = new DynamicModel({ event: "", object: {} });
            c.bind(payload);
        } else {
            if (typeof c.requestInfo === "function") {
                payload = c.requestInfo().body;
            } else {
                try {
                    payload = $apis.requestInfo(c).data;
                } catch(e) {
                    payload = JSON.parse(require("io/ioutil").readAll(c.request().body));
                }
            }
        }
        
        if (!payload || !payload.event) {
            return c.json(400, { error: "Empty payload" });
        }
        
        if (payload.event === "payment.succeeded") {
            step = "process_payment";
            const payment = payload.object;
            const userId = payment.metadata.userId;
            const planKey = payment.metadata.plan;
            
            if (!userId || !planKey || !PLANS[planKey]) {
                return c.json(400, { error: "Invalid metadata" });
            }
            
            step = "update_user";
            let userRecord;
            try {
                userRecord = $app.findRecordById("users", userId);
            } catch(err) {
                userRecord = $app.dao().findRecordById("users", userId);
            }
            
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
            
            if (typeof $app.save === "function") {
                $app.save(userRecord);
            } else {
                $app.dao().saveRecord(userRecord);
            }
        }
        return c.json(200, { success: true });
    } catch (err) {
        $app.logger().error("Webhook exception", "step", step, "error", String(err));
        return c.json(400, { error: String(err), step: step });
    }
});
