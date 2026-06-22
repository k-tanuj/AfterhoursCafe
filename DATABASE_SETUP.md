# AFTERHOURS — MySQL Database Setup

Run these queries in **MySQL Workbench** (or any MySQL 8.0+ client) once, in the order shown, to create every table the app needs. Default schema name is `afterhours` — change it if you like, but keep it consistent in your `.env`.

> ⚠️ This is the **MySQL translation** of the current Postgres schema. Notable changes vs. the previous version:
> - `UUID` columns → `CHAR(36)` (generated in app code with `crypto.randomUUID()`).
> - `TIMESTAMPTZ` → `DATETIME` (store UTC from the app).
> - `JSONB` → `JSON`.
> - `auth.users` is gone — there is now a local `users` table for email/password login (bcrypt hash).
> - Row-Level Security policies are **not** ported. Access control happens in the server code (session + role check) instead.

---

## 0. Create the database

```sql
CREATE DATABASE IF NOT EXISTS afterhours
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE afterhours;
```

---

## 1. Users & roles (auth)

```sql
CREATE TABLE users (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  display_name  VARCHAR(120),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE user_roles (
  id      CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role    ENUM('admin','user') NOT NULL DEFAULT 'user',
  UNIQUE KEY uq_user_role (user_id, role),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sessions (
  id         CHAR(64) NOT NULL PRIMARY KEY,   -- session token (random)
  user_id    CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB;
```

## 2. Profiles

```sql
CREATE TABLE profiles (
  id           CHAR(36)     NOT NULL PRIMARY KEY,  -- = users.id
  display_name VARCHAR(120),
  avatar_url   TEXT,
  bio          TEXT,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

## 3. Restaurant tables (floor inventory)

```sql
CREATE TABLE restaurant_tables (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  table_no   VARCHAR(20)  NOT NULL UNIQUE,
  capacity   INT          NOT NULL,
  location   VARCHAR(40)  NOT NULL DEFAULT 'indoor',
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  notes      TEXT,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,
  CHECK (capacity > 0)
) ENGINE=InnoDB;

-- Seed tables so booking works immediately
INSERT INTO restaurant_tables (id, table_no, capacity, location) VALUES
  (UUID(), 'T1', 2, 'indoor'),
  (UUID(), 'T2', 2, 'indoor'),
  (UUID(), 'T3', 4, 'indoor'),
  (UUID(), 'T4', 4, 'window'),
  (UUID(), 'T5', 6, 'indoor'),
  (UUID(), 'T6', 8, 'outdoor');
```

## 4. Bookings

```sql
CREATE TABLE bookings (
  id                  CHAR(36)     NOT NULL PRIMARY KEY,
  user_id             CHAR(36)     NOT NULL,
  booking_date        VARCHAR(20)  NOT NULL,   -- 'YYYY-MM-DD'
  booking_time        VARCHAR(20)  NOT NULL,   -- 'HH:MM'
  party               INT          NOT NULL DEFAULT 2,
  guest_name          VARCHAR(120),
  guest_phone         VARCHAR(40),
  guest_email         VARCHAR(200),
  mood                VARCHAR(60),
  occasion            VARCHAR(60),
  seating_preference  VARCHAR(60),
  requests            TEXT,
  status              VARCHAR(20)  NOT NULL DEFAULT 'pending',
  table_id            CHAR(36),
  reference_code      VARCHAR(20)  UNIQUE,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id)  REFERENCES users(id)             ON DELETE CASCADE,
  CONSTRAINT fk_bookings_table
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  INDEX idx_bookings_date_time (booking_date, booking_time),
  INDEX idx_bookings_table     (table_id, booking_date, booking_time)
) ENGINE=InnoDB;
```

## 5. Menu items

```sql
CREATE TABLE menu_items (
  id               CHAR(36)       NOT NULL PRIMARY KEY,
  name             VARCHAR(160)   NOT NULL,
  category         VARCHAR(60)    NOT NULL,
  description      TEXT           NOT NULL,
  price            DECIMAL(10,2)  NOT NULL,
  image_url        TEXT,
  taste_profile    VARCHAR(100),
  temperature      VARCHAR(50),
  caffeine_level   VARCHAR(50),
  dietary_tags     VARCHAR(100),
  popularity_score INT            DEFAULT 50,
  sort_order       INT            NOT NULL DEFAULT 100,
  is_available     TINYINT(1)     NOT NULL DEFAULT 1,
  created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  CHECK (price >= 0)
) ENGINE=InnoDB;

-- Seed menu
INSERT INTO menu_items (id, name, category, description, price, sort_order, taste_profile, temperature, caffeine_level, dietary_tags, popularity_score) VALUES
  (UUID(),'Ghost Shot Espresso','Strong','Double shot, no sugar, no mercy.',180,10,'Bitter, Strong','Hot','High','Vegan, Dairy-Free',85),
  (UUID(),'Cloudy Cold Brew','Cold','12-hour brew, vanilla cream cloud.',220,20,'Smooth, Creamy','Cold','High','Vegetarian',95),
  (UUID(),'Midnight Matcha','Sweet','Ceremonial grade, oat milk leaf.',260,30,'Sweet, Earthy','Hot','Low','Vegan',90),
  (UUID(),'Lavender Fog','Hot','Earl grey + steamed milk + lavender.',200,40,'Floral, Sweet','Hot','Low','Vegetarian',80),
  (UUID(),'Burnt Honey Latte','Sweet','Caramelised honey, espresso, foam.',240,50,'Sweet, Caramel','Hot','Medium','Vegetarian',88),
  (UUID(),'Saffron Cortado','Strong','Saffron-laced milk, two shots.',280,60,'Spiced, Strong','Hot','Medium','Vegetarian',75),
  (UUID(),'Study Drip','Study','Bottomless filter coffee, 3pm to 3am.',150,70,'Bitter, Clean','Hot','High','Vegan, Dairy-Free',99),
  (UUID(),'3am Mocha','Late Night','Dark chocolate, espresso, oat.',250,80,'Chocolate, Sweet','Hot','Medium','Vegetarian',92),
  (UUID(),'Insomnia Iced','Late Night','Cold brew + tonic. Bad idea, great taste.',230,90,'Crisp, Bubbly','Cold','High','Vegan, Dairy-Free',85);
```

## 6. Loyalty — customers & orders

```sql
CREATE TABLE customers (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  email           VARCHAR(200) NOT NULL UNIQUE,
  name            VARCHAR(120) NOT NULL,
  stamps          INT          NOT NULL DEFAULT 0,
  last_stamp_date DATE,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE orders (
  id             CHAR(36)      NOT NULL PRIMARY KEY,
  customer_id    CHAR(36)      NOT NULL,
  customer_name  VARCHAR(120)  NOT NULL,
  email          VARCHAR(200)  NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  order_date     DATE          NOT NULL,
  stamp_awarded  TINYINT(1)    NOT NULL DEFAULT 0,
  status         ENUM('placed', 'preparing', 'completed') NOT NULL DEFAULT 'completed',
  logged_by      CHAR(36),
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (logged_by)   REFERENCES users(id)     ON DELETE SET NULL,
  INDEX idx_orders_customer  (customer_id),
  INDEX idx_orders_date      (order_date),
  CHECK (amount >= 0)
) ENGINE=InnoDB;
```

## 7. Feedback

```sql
CREATE TABLE feedback (
  id         CHAR(36)  NOT NULL PRIMARY KEY,
  user_id    CHAR(36),
  rating     INT       NOT NULL,
  message    TEXT,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;
```

## 8. Chill-Pill wall (notes)

```sql
CREATE TABLE chill_notes (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  user_id    CHAR(36),
  text       TEXT         NOT NULL,
  who        VARCHAR(80),
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chill_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_chill_created (created_at)
) ENGINE=InnoDB;
```

## 9. Polaroid wall

```sql
CREATE TABLE memory_polaroids (
  id         CHAR(36)  NOT NULL PRIMARY KEY,
  user_id    CHAR(36)  NOT NULL,
  photo_url  TEXT      NOT NULL,        -- store either an http(s) URL or a relative /uploads/... path
  caption    TEXT,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_polaroid_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_polaroid_created (created_at),
  INDEX idx_polaroid_user_created (user_id, created_at)
) ENGINE=InnoDB;
```

> Note: Supabase Storage is gone. For polaroid photos you either (a) store remote URLs only, or (b) save uploaded files to a local folder like `./public/uploads/` and write the relative path into `photo_url`.

## 10. Demand forecasts (admin analytics)

```sql
CREATE TABLE demand_forecasts (
  id                    CHAR(36)  NOT NULL PRIMARY KEY,
  trained_at            DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  training_window_start DATE,
  training_window_end   DATE,
  sample_size           INT       NOT NULL DEFAULT 0,
  mae                   DECIMAL(10,4),
  predictions           JSON      NOT NULL,
  notes                 TEXT,
  created_at            DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_forecasts_trained (trained_at)
) ENGINE=InnoDB;
```

## 11. Chat History (AI Buddy)

```sql
CREATE TABLE chat_history (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

## 12. Create the first admin

After you sign up once through the app (`/auth`), promote that user to admin:

```sql
-- replace with the email you signed up with
SELECT id FROM users WHERE email = 'admin@afterhours.cafe';

INSERT INTO user_roles (id, user_id, role)
SELECT UUID(), id, 'admin' FROM users WHERE email = 'admin@afterhours.cafe';
```

---

## 12. Sanity check

```sql
SHOW TABLES;
-- expected: bookings, chill_notes, customers, demand_forecasts, feedback,
--           memory_polaroids, menu_items, orders, profiles, restaurant_tables,
--           sessions, user_roles, users

SELECT COUNT(*) AS tables_seeded FROM restaurant_tables;  -- 6
SELECT COUNT(*) AS menu_seeded   FROM menu_items;         -- 9
```

---

## 13. `.env` for the app

After tables are created, point the app at your local MySQL:

```
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=afterhours
SESSION_SECRET=any_long_random_string
```

That's the full schema. Run sections 0 → 10 once, then section 11 after your first signup.