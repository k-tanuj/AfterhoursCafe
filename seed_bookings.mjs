import mysql from "mysql2/promise";
import crypto from "crypto";

// Helper to generate a random number within range
const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate 4 weeks of synthetic bookings
async function seedBookings() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "student",
    database: "afterhours",
  });

  try {
    // Get a valid user_id to assign to these bookings
    const [users] = await conn.execute("SELECT id FROM users LIMIT 1");
    if (users.length === 0) {
      console.log("No users found. Please create a user first.");
      return;
    }
    const userId = users[0].id;

    const endDate = new Date("2026-06-17T00:00:00Z"); // Today based on metadata
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 28); // 4 weeks ago

    let totalInserted = 0;
    
    console.log(`Generating synthetic bookings from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0 (Sun) - 6 (Sat)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Fri, Sat, Sun

      // Hours: 12 PM to 3 AM (12, 13, ..., 23, 0, 1, 2)
      const operatingHours = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];

      for (const hour of operatingHours) {
        let baseDemand = isWeekend ? 6 : 3;

        // Dinner rush
        if (hour >= 18 && hour <= 21) baseDemand += isWeekend ? 8 : 4;
        
        // Late night vibe
        if (hour >= 23 || hour <= 2) baseDemand += isWeekend ? 5 : 2;

        const noise = randomInRange(-2, 2);
        let numBookings = Math.max(0, baseDemand + noise);

        for (let i = 0; i < numBookings; i++) {
          const id = crypto.randomUUID();
          
          // Format time as HH:00
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;
          
          const parties = [1, 2, 2, 2, 3, 4, 4, 6];
          const party = parties[randomInRange(0, parties.length - 1)];
          
          const moods = ["chill", "date", "study", "celebration"];
          const mood = moods[randomInRange(0, moods.length - 1)];

          const createdAt = new Date(currentDate);
          createdAt.setHours(createdAt.getHours() - randomInRange(1, 48)); // Created sometime before

          await conn.execute(
            `INSERT INTO bookings 
             (id, user_id, booking_date, booking_time, party, guest_name, mood, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              userId,
              dateStr,
              timeStr,
              party,
              "Synthetic Guest",
              mood,
              "confirmed",
              createdAt.toISOString().slice(0, 19).replace('T', ' ')
            ]
          );
          totalInserted++;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Successfully generated ${totalInserted} synthetic bookings!`);

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await conn.end();
  }
}

seedBookings();
