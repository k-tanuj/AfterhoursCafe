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

  const [users] = await db.execute("SELECT id FROM users WHERE email = 'tanujkumawat3008@gmail.com'");
  if (users.length === 0) {
    console.log("User not found!");
  } else {
    const userId = users[0].id;
    const [existing] = await db.execute("SELECT id FROM user_roles WHERE user_id = ?", [userId]);
    if (existing.length > 0) {
      const [result] = await db.execute("UPDATE user_roles SET role = 'admin' WHERE user_id = ?", [userId]);
      console.log('Role updated successfully! Rows affected:', result.affectedRows);
    } else {
      const crypto = require('crypto');
      const [result] = await db.execute("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')", [crypto.randomUUID(), userId]);
      console.log('Role inserted successfully! Rows affected:', result.affectedRows);
    }
  }
  await db.end();
}

run();
