routerAdd("POST", "/api/support", (c) => {
    try {
        const body = new DynamicModel({ name: "", email: "", message: "" });
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
            body.name = data.name;
            body.email = data.email;
            body.message = data.message;
        }

        const subject = "Новое обращение в поддержку от " + (body.name || "пользователя");
        const html = `
            <p><strong>Имя:</strong> ${body.name}</p>
            <p><strong>Email:</strong> ${body.email}</p>
            <p><strong>Сообщение:</strong><br/>${body.message}</p>
        `;

        try {
            const message = new MailerMessage({
                from: {
                    address: $app.settings().meta.senderAddress,
                    name: $app.settings().meta.senderName,
                },
                to: [{ address: "help@tochilka.app" }],
                subject: subject,
                html: html,
            });
            $app.newMailClient().send(message);
        } catch (mailErr) {
            $app.logger().error("Support mail send error", "error", String(mailErr));
            // If mailer fails (e.g. SMTP not configured), we still want to save the request or return error
            // Fallback to saving in a collection if we had one, but we don't.
            return c.json(500, { error: "Failed to send email. Ensure SMTP is configured." });
        }

        return c.json(200, { success: true });
    } catch (err) {
        $app.logger().error("Support route error", "error", String(err));
        return c.json(400, { error: String(err) });
    }
});
