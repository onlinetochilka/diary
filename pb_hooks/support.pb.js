routerAdd("POST", "/api/support", (c) => {
    try {
        const body = new DynamicModel({ name: "", email: "", message: "" });
        c.bindBody(body);

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
            return c.json(500, { error: "Failed to send email. Ensure SMTP is configured." });
        }

        return c.json(200, { success: true });
    } catch (err) {
        $app.logger().error("Support route error", "error", String(err));
        return c.json(400, { error: String(err) });
    }
});
