import { db } from './src/lib/db';

async function run() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          passwordHash VARCHAR(255) NOT NULL,
          role ENUM('USER', 'ADMIN') DEFAULT 'USER',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Sessions (
          id VARCHAR(36) PRIMARY KEY,
          sessionToken VARCHAR(255) UNIQUE NOT NULL,
          userId VARCHAR(36) NOT NULL,
          expires DATETIME NOT NULL,
          FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Profiles (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) UNIQUE NOT NULL,
          full_name VARCHAR(255),
          phone VARCHAR(20),
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS menu_items (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          image_url VARCHAR(500),
          sort_order INT DEFAULT 100,
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Successfully created Phase 1 & 2 Tables!');
    process.exit(0);
  } catch (err: any) {
    console.error('Failed to create tables:', err.message);
    process.exit(1);
  }
}

run();
