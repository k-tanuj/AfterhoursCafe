import mysql from 'mysql2/promise';

const db = process.env.DATABASE_URL 
  ? mysql.createPool(process.env.DATABASE_URL)
  : mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'student',
    database: process.env.MYSQL_DATABASE || 'afterhours',
    ssl: process.env.MYSQL_HOST ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function run() {
  try {
    console.log("Adding columns to menu_items...");
    
    // Check if columns exist first so we don't crash if re-running
    const [cols]: any = await db.execute("SHOW COLUMNS FROM menu_items");
    const colNames = cols.map((c: any) => c.Field);

    if (!colNames.includes('taste_profile')) {
      await db.execute("ALTER TABLE menu_items ADD COLUMN taste_profile VARCHAR(100)");
      console.log("Added taste_profile");
    }
    if (!colNames.includes('temperature')) {
      await db.execute("ALTER TABLE menu_items ADD COLUMN temperature VARCHAR(50)");
      console.log("Added temperature");
    }
    if (!colNames.includes('caffeine_level')) {
      await db.execute("ALTER TABLE menu_items ADD COLUMN caffeine_level VARCHAR(50)");
      console.log("Added caffeine_level");
    }
    if (!colNames.includes('dietary_tags')) {
      await db.execute("ALTER TABLE menu_items ADD COLUMN dietary_tags VARCHAR(100)");
      console.log("Added dietary_tags");
    }
    if (!colNames.includes('popularity_score')) {
      await db.execute("ALTER TABLE menu_items ADD COLUMN popularity_score INT DEFAULT 50");
      console.log("Added popularity_score");
    }

    console.log("Updating seed data for existing items...");
    
    // Ghost Shot Espresso
    await db.execute("UPDATE menu_items SET taste_profile=?, temperature=?, caffeine_level=?, dietary_tags=?, popularity_score=? WHERE name=?", 
      ["Bitter, Strong", "Hot", "High", "Vegan, Dairy-Free", 85, 'Ghost Shot Espresso']);
      
    // Cloudy Cold Brew
    await db.execute("UPDATE menu_items SET taste_profile=?, temperature=?, caffeine_level=?, dietary_tags=?, popularity_score=? WHERE name=?", 
      ["Smooth, Creamy", "Cold", "High", "Vegetarian", 95, 'Cloudy Cold Brew']);

    // Midnight Matcha
    await db.execute("UPDATE menu_items SET taste_profile=?, temperature=?, caffeine_level=?, dietary_tags=?, popularity_score=? WHERE name=?", 
      ["Sweet, Earthy", "Hot", "Low", "Vegan", 90, 'Midnight Matcha']);
      
    // Lavender Fog
    await db.execute("UPDATE menu_items SET taste_profile=?, temperature=?, caffeine_level=?, dietary_tags=?, popularity_score=? WHERE name=?", 
      ["Floral, Sweet", "Hot", "Low", "Vegetarian", 80, 'Lavender Fog']);
      
    // Burnt Honey Latte
    await db.execute("UPDATE menu_items SET taste_profile=?, temperature=?, caffeine_level=?, dietary_tags=?, popularity_score=? WHERE name=?", 
      ["Sweet, Caramel", "Hot", "Medium", "Vegetarian", 88, 'Burnt Honey Latte']);
      
    // Saffron Cortado
    await db.execute("UPDATE menu_items SET taste_profile=?, temperature=?, caffeine_level=?, dietary_tags=?, popularity_score=? WHERE name=?", 
      ["Spiced, Strong", "Hot", "Medium", "Vegetarian", 75, 'Saffron Cortado']);
      
    // Study Drip
    await db.execute("UPDATE menu_items SET taste_profile=?, temperature=?, caffeine_level=?, dietary_tags=?, popularity_score=? WHERE name=?", 
      ["Bitter, Clean", "Hot", "High", "Vegan, Dairy-Free", 99, 'Study Drip']);
      
    // 3am Mocha
    await db.execute("UPDATE menu_items SET taste_profile=?, temperature=?, caffeine_level=?, dietary_tags=?, popularity_score=? WHERE name=?", 
      ["Chocolate, Sweet", "Hot", "Medium", "Vegetarian", 92, '3am Mocha']);
      
    // Insomnia Iced
    await db.execute("UPDATE menu_items SET taste_profile=?, temperature=?, caffeine_level=?, dietary_tags=?, popularity_score=? WHERE name=?", 
      ["Crisp, Bubbly", "Cold", "High", "Vegan, Dairy-Free", 85, 'Insomnia Iced']);

    console.log("Migration complete!");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed", e);
    process.exit(1);
  }
}

run();
