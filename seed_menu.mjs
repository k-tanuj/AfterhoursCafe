import mysql from "mysql2/promise";
import crypto from "crypto";

const menuItems = [
  // Hot Coffees
  { category: "Hot Coffees", name: "Espresso", price: 120, description: "A bold shot of rich, aromatic coffee with a deep flavor profile" },
  { category: "Hot Coffees", name: "Americano", price: 140, description: "Espresso diluted with hot water for a smooth and balanced cup" },
  { category: "Hot Coffees", name: "Cappuccino", price: 180, description: "Classic blend of espresso, steamed milk, and a velvety foam top" },
  { category: "Hot Coffees", name: "Café Latte", price: 190, description: "Creamy espresso with perfectly steamed milk and a light layer of foam" },
  { category: "Hot Coffees", name: "Flat White", price: 200, description: "Strong espresso paired with silky micro-foam milk" },
  { category: "Hot Coffees", name: "Mocha", price: 220, description: "Espresso blended with chocolate and steamed milk, topped with cocoa" },
  { category: "Hot Coffees", name: "Caramel Latte", price: 230, description: "Smooth latte infused with sweet caramel syrup" },
  { category: "Hot Coffees", name: "Hazelnut Cappuccino", price: 230, description: "A nutty twist on the classic cappuccino with roasted hazelnut notes" },
  
  // Cold Coffees
  { category: "Cold Coffees", name: "Classic Cold Coffee", price: 200, description: "Chilled coffee blended with milk and ice, finished with a creamy texture" },
  { category: "Cold Coffees", name: "Iced Americano", price: 170, description: "Bold espresso poured over ice for a refreshing coffee experience" },
  { category: "Cold Coffees", name: "Iced Latte", price: 210, description: "Smooth espresso mixed with cold milk and ice" },
  { category: "Cold Coffees", name: "Vanilla Cold Brew", price: 240, description: "Slow-brewed coffee infused with subtle vanilla sweetness" },
  { category: "Cold Coffees", name: "Caramel Frappe", price: 260, description: "Blended coffee with caramel, milk, and ice topped with whipped cream" },
  { category: "Cold Coffees", name: "Chocolate Mocha Frappe", price: 270, description: "Rich chocolate and coffee blended into a decadent frozen drink" },
  { category: "Cold Coffees", name: "Affogato", price: 250, description: "Hot espresso poured over a scoop of vanilla ice cream" },
  
  // Waffles
  { category: "Waffles", name: "Classic Belgian", price: 220, description: "Crispy golden waffle served with maple syrup and fresh cream" },
  { category: "Waffles", name: "Nutella Dream", price: 280, description: "Warm waffle topped with Nutella, chocolate shavings, and nuts" },
  { category: "Waffles", name: "Berry Bliss", price: 290, description: "Mixed berry compote, cream cheese, and fresh fruits" },
  { category: "Waffles", name: "Biscoff Crunch", price: 300, description: "Biscoff spread, crushed biscuits, and vanilla ice cream" },
  { category: "Waffles", name: "Dark Chocolate Espresso", price: 280, description: "Chocolate-drizzled waffle with a hint of espresso and cream" },
  
  // Pancakes
  { category: "Pancakes", name: "Classic American", price: 240, description: "Fluffy pancakes served with maple syrup and powdered sugar" },
  { category: "Pancakes", name: "Strawberry Cream Stack", price: 290, description: "Fresh strawberries, whipped cream, and berry sauce" },
  { category: "Pancakes", name: "Chocolate Indulgence", price: 300, description: "Chocolate sauce, cocoa dust, and chocolate chips" },
  { category: "Pancakes", name: "Banana Caramel Pancakes", price: 280, description: "Caramelized banana with homemade caramel drizzle" },
  { category: "Pancakes", name: "Biscoff Blueberry", price: 320, description: "Biscoff spread with blueberry compote and crunchy nuts" },
  
  // Donuts
  { category: "Donuts", name: "Classic Sugar Donut", price: 90, description: "Soft fluffy donut coated with fine sugar" },
  { category: "Donuts", name: "Chocolate Glazed", price: 120, description: "Rich chocolate glaze with chocolate flakes" },
  { category: "Donuts", name: "Biscoff Filled", price: 150, description: "Creamy Biscoff filling with biscuit crumbs" },
  { category: "Donuts", name: "Nutella Burst", price: 160, description: "Filled with Nutella and topped with chocolate drizzle" },
  { category: "Donuts", name: "Berry Cheesecake Donut", price: 170, description: "Cream cheese filling with fresh berry topping" },
  
  // Toasts
  { category: "Toasts", name: "Avocado Feta Toast", price: 340, description: "Smashed avocado, feta cheese, cherry tomatoes, and balsamic drizzle" },
  { category: "Toasts", name: "Cream Cheese & Berry Toast", price: 280, description: "Cream cheese spread with blueberry compote and fresh fruits" },
  { category: "Toasts", name: "Masala Scramble Toast", price: 260, description: "Creamy egg scramble with herbs served on sourdough" },
  { category: "Toasts", name: "Hummus Veggie Toast", price: 250, description: "Beetroot hummus, fresh vegetables, olive oil, and dukkah spice" },
  { category: "Toasts", name: "Mushroom & Cheese Toast", price: 290, description: "Sautéed mushrooms, melted cheese, and herbs on toasted sourdough" },
  
  // Smoothies
  { category: "Smoothies", name: "Tropical Escape", price: 270, description: "Banana, pineapple, mango, and coconut milk blended chilled" },
  { category: "Smoothies", name: "Berry Blast", price: 300, description: "Strawberries, blueberries, yogurt, and honey" },
  { category: "Smoothies", name: "Chocolate Bliss", price: 320, description: "Banana, cocoa, milk, and dark chocolate topped with granola" },
  { category: "Smoothies", name: "Green Glow", price: 290, description: "Spinach, banana, apple, and almond milk" },
  { category: "Smoothies", name: "Peanut Butter Protein", price: 330, description: "Peanut butter, banana, dates, milk, and oats" },
  
  // Add-ons
  { category: "Add-ons", name: "Extra Espresso Shot", price: 60, description: "" },
  { category: "Add-ons", name: "Ice Cream Scoop", price: 70, description: "" },
  { category: "Add-ons", name: "Whipped Cream", price: 50, description: "" },
  { category: "Add-ons", name: "Almond / Oat Milk", price: 80, description: "" },
  { category: "Add-ons", name: "Extra Chocolate / Caramel Sauce", price: 40, description: "" },
];

async function seedMenu() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "student",
    database: "afterhours",
  });

  try {
    console.log("Deleting existing menu items...");
    await conn.execute("DELETE FROM menu_items");

    console.log("Inserting new menu items...");
    let sortOrder = 1;
    for (const item of menuItems) {
      const id = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO menu_items (id, name, category, description, price, image_url, sort_order, is_available) VALUES (?, ?, ?, ?, ?, NULL, ?, 1)`,
        [id, item.name, item.category, item.description, item.price, sortOrder]
      );
      sortOrder++;
    }
    console.log("Menu successfully updated.");
  } catch (err) {
    console.error("Error seeding menu:", err);
  } finally {
    await conn.end();
  }
}

seedMenu();
