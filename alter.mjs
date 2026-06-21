import mysql from 'mysql2/promise';

async function alter() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await connection.query('ALTER TABLE memory_polaroids MODIFY photo_url LONGTEXT NOT NULL;');
    await connection.query('ALTER TABLE menu_items MODIFY image_url LONGTEXT;');
    console.log("Altered tables to LONGTEXT!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await connection.end();
  }
}

alter();
