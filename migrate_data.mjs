import mysql from 'mysql2/promise';


async function migrate() {
  const localDb = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'student',
    database: 'afterhours'
  });

  const aivenDb = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: { rejectUnauthorized: false }
  });

  const tables = [
    'users', 'user_roles', 'profiles', 'restaurant_tables', 
    'menu_items', 'customers', 'sessions', 'bookings', 
    'orders', 'feedback', 'chill_notes', 'memory_polaroids', 
    'demand_forecasts'
  ];

  try {
    console.log("Disabling foreign key checks on Aiven...");
    await aivenDb.query('SET FOREIGN_KEY_CHECKS=0;');

    for (const table of tables) {
      console.log(`Clearing Aiven table: ${table}`);
      await aivenDb.query(`TRUNCATE TABLE ${table}`);
      
      console.log(`Fetching data from local table: ${table}`);
      const [rows] = await localDb.query(`SELECT * FROM ${table}`);
      
      if (rows.length === 0) {
        console.log(`No data in ${table}, skipping.`);
        continue;
      }

      console.log(`Migrating ${rows.length} rows to ${table}...`);
      
      // Batch insert to avoid huge queries
      const batchSize = 100;
      const keys = Object.keys(rows[0]);
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        const values = batch.map(row => 
          keys.map(key => {
            const val = row[key];
            if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
              return JSON.stringify(val);
            }
            return val;
          })
        );

        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ?`;
        
        await aivenDb.query(sql, [values]);
      }
      console.log(`Successfully migrated ${table}.`);
    }

    console.log("Re-enabling foreign key checks...");
    await aivenDb.query('SET FOREIGN_KEY_CHECKS=1;');
    console.log("Migration complete!");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await localDb.end();
    await aivenDb.end();
  }
}

migrate();
