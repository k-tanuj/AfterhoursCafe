import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'student',
    database: process.env.MYSQL_DATABASE || 'afterhours',
    ssl: process.env.MYSQL_HOST ? { rejectUnauthorized: false } : undefined,
  });
  
  try {
    const [monthly] = await connection.execute(
      `SELECT order_date, SUM(amount) as daily_revenue FROM orders WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY order_date ORDER BY order_date ASC`
    );
    console.log("Monthly success", monthly);

    const [top] = await connection.execute(
      "SELECT items_json FROM orders WHERE items_json IS NOT NULL AND items_json != 'null' ORDER BY created_at DESC LIMIT 500"
    );
    console.log("Top success", top.length);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error(err);
    }
  }

  connection.end();
}

run();
