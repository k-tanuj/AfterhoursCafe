import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'student',
    database: 'afterhours',
  });
  
  try {
    const [tables] = await conn.execute('SHOW TABLES');
    console.log('--- Tables ---');
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      console.log(`\nTable: ${tableName}`);
      const [columns] = await conn.execute(`DESCRIBE \`${tableName}\``);
      console.table(columns);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}

main();
