import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';


async function setup() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const markdown = fs.readFileSync('DATABASE_SETUP.md', 'utf8');
    const sqlBlocks = [...markdown.matchAll(/```sql\n([\s\S]*?)```/g)].map(m => m[1]);
    
    for (const block of sqlBlocks) {
      const statements = block.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const sql of statements) {
        if (sql.toUpperCase().startsWith('CREATE DATABASE') || sql.toUpperCase().startsWith('USE ')) {
          continue; // Skip DB creation since Aiven manages it
        }
        console.log(`Executing: ${sql.substring(0, 50)}...`);
        await connection.query(sql);
      }
    }
    console.log("Database setup complete!");
  } catch (err) {
    console.error("Error setting up database:", err);
  } finally {
    await connection.end();
  }
}

setup();
