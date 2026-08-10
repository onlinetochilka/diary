migrate((db) => {
    // Попытка для PocketBase v0.23+
    try {
        const collection = db.findCollectionByNameOrId("users");
        let changed = false;
        if (!collection.fields.getByName("subscription_status")) {
            collection.fields.add({ name: "subscription_status", type: "select", options: { maxSelect: 1, values: ["active", "inactive"] } });
            changed = true;
        }
        if (!collection.fields.getByName("subscription_until")) {
            collection.fields.add({ name: "subscription_until", type: "date" });
            changed = true;
        }
        if (!collection.fields.getByName("yookassa_payment_id")) {
            collection.fields.add({ name: "yookassa_payment_id", type: "text" });
            changed = true;
        }
        if (changed) {
            db.save(collection);
        }
        return; // Успешно выполнили v0.23
    } catch (e) {
        // Если метод не найден, значит это старая версия PB (v0.22 и ниже)
    }

    // Попытка для PocketBase v0.22 и ниже
    try {
        const dao = new Dao(db);
        const collection = dao.findCollectionByNameOrId("users");
        let changed = false;
        
        if (!collection.schema.getFieldByName("subscription_status")) {
            collection.schema.addField(new SchemaField({ 
                name: "subscription_status", 
                type: "select", 
                options: { maxSelect: 1, values: ["active", "inactive"] } 
            }));
            changed = true;
        }
        if (!collection.schema.getFieldByName("subscription_until")) {
            collection.schema.addField(new SchemaField({ name: "subscription_until", type: "date" }));
            changed = true;
        }
        if (!collection.schema.getFieldByName("yookassa_payment_id")) {
            collection.schema.addField(new SchemaField({ name: "yookassa_payment_id", type: "text" }));
            changed = true;
        }
        if (changed) {
            dao.saveCollection(collection);
        }
    } catch (e) {
        console.error("Migration failed:", e);
    }
});
