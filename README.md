# Afterhours Cafe

<p align="center">
  <img src="afterhours_home.png" alt="Afterhours Cafe Homepage" width="800">
</p>

Welcome to the Afterhours Cafe repository! This project is a modern, feature-rich full-stack web application built to serve both cafe customers and administrators. It provides a seamless user experience for ordering and reservations, along with powerful management and AI-driven analytics tools for the cafe staff.

## ✨ Features

### Customer Experience
- **Digital Menu & Ordering**: Browse a dynamic menu and place orders smoothly via an intuitive checkout process.
- **Table Reservations**: Book a table in advance through our interactive booking system.
- **"Chill Pill" Zone**: A dedicated, interactive space on the site for customers to relax and engage with the cafe's vibe.
- **Authentication**: Secure and fast login/signup powered by Firebase.
- **AI "Buddy" Assistant**: Smart, AI-driven interactions to assist users.

### Admin & Management Dashboard
- **Comprehensive Analytics**: Real-time insights into sales, orders, and customer traffic.
- **AI Demand Forecasting**: Built-in Machine Learning models (Python-based) to predict future demand, helping with inventory and staff management.
- **Order & Booking Management**: Dedicated interfaces to track active orders, manage table assignments, and review customer bookings.
- **Menu Management**: Easily update, add, or remove items from the digital menu.
- **Customer & Feedback Management**: Monitor customer reviews, manage feedback, and maintain the community wall.

---

## 🚀 Tech Stack

The application leverages a cutting-edge technology stack to ensure high performance, security, and developer productivity:

### Frontend
- **Framework**: [TanStack Start](https://tanstack.com/start) (Full-stack React framework)
- **Library**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)

### Backend & Infrastructure
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Authentication**: [Firebase](https://firebase.google.com/)
- **Database**: [Aiven](https://aiven.io/) (MySQL managed via custom scripts and migrations)
- **Machine Learning**: Python (Scikit-learn/Joblib) for demand forecasting models

---

## 🏗️ System Architecture

The system is designed with a decoupled, modern architecture:

1. **Client Layer**: A responsive React SPA/SSR hybrid built with TanStack Start, providing dynamic routing and optimistic UI updates.
2. **API & Middle Tier**: Server functions and API routes handle business logic, database queries, and third-party integrations (like Firebase Auth).
3. **Data Layer**: 
   - Aiven (MySQL) stores core business data (users, menus, orders, bookings).
   - Custom migration scripts (`migrate.mjs`, `setup_aiven_db.mjs`) maintain the schema.
4. **AI/ML Service**: A Python backend (located in `/python-ml`) that trains and serves the demand forecasting models via joblib bundles, interacting with the main Node/Bun application.

---

## 🔄 Project Flow

1. **User Interaction**: Customers interact with the Vite-powered frontend to browse menus or book tables.
2. **Authentication**: Firebase verifies the user's identity and returns a secure token.
3. **Data Processing**: User actions (e.g., placing an order) hit the TanStack API routes, which execute business logic and validate data using Zod.
4. **Database Operations**: The API securely reads/writes to the Aiven MySQL database.
5. **Admin Monitoring & ML**: Administrators view live analytics on their dashboard. The system periodically uses the Python ML bundle to analyze past data and generate demand forecasts.


