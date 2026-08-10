migrate((db) => {
  const collection = db.findCollectionByNameOrId("users");

  // Добавляем поле subscription_status
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sub_stat",
    "name": "subscription_status",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": ["active", "inactive"]
    }
  }));

  // Добавляем поле subscription_until
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sub_until",
    "name": "subscription_until",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }));

  // Добавляем поле yookassa_payment_id
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yook_id",
    "name": "yookassa_payment_id",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }));

  return db.saveCollection(collection);
}, (db) => {
  const collection = db.findCollectionByNameOrId("users");
  collection.schema.removeField("subscription_status");
  collection.schema.removeField("subscription_until");
  collection.schema.removeField("yookassa_payment_id");
  return db.saveCollection(collection);
});
