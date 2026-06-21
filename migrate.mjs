import mysql from 'mysql2/promise';

async function run() {
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Altering orders table...");
    try {
      await db.execute("ALTER TABLE orders ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'");
      await db.execute("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'offline'");
      await db.execute("ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) NOT NULL DEFAULT 'takeaway'");
      await db.execute("ALTER TABLE orders ADD COLUMN table_no VARCHAR(20)");
    } catch (e) {
      console.log("Note: columns might already exist.", e.message);
    }

    console.log("Creating order_items table...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id CHAR(36) NOT NULL PRIMARY KEY,
        order_id CHAR(36) NOT NULL,
        menu_item_id CHAR(36) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        menu_item_name VARCHAR(160) NOT NULL,
        CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Migration complete!");
  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
  }
}

run();
