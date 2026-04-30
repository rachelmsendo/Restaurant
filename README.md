# 🍽️ RestaurantOS — Smart Digital Menu & Table Ordering System

A production-grade, full-stack restaurant ordering platform. Customers scan a QR code at their table, browse the menu, place orders, and pay — all in their mobile browser. Orders flow in real-time to the Kitchen Display System (KDS). Admins manage everything from a clean dashboard.

---

## 📐 System Architecture

```
restaurantOS/
├── backend/          # Node.js + Express API + Socket.io
│   └── src/
│       ├── config/         # DB, cloudinary, stripe config
│       ├── controllers/    # Route handlers (MVC)
│       ├── middleware/      # Auth, validation, error handling
│       ├── models/         # Mongoose schemas
│       ├── routes/         # Express routers
│       ├── services/       # Business logic layer
│       ├── sockets/        # Socket.io event handlers
│       └── utils/          # QR gen, helpers
└── frontend/         # Next.js 14 + Tailwind + Redux Toolkit
    └── src/
        ├── app/            # Next.js App Router pages
        │   ├── menu/       # Customer interface (QR-accessed)
        │   ├── admin/      # Admin dashboard
        │   └── kitchen/    # Kitchen Display System
        ├── components/
        │   ├── ui/         # Reusable design system
        │   ├── customer/   # Customer-facing components
        │   ├── admin/      # Admin-specific components
        │   └── kitchen/    # KDS components
        ├── hooks/          # Custom React hooks
        ├── store/          # Redux Toolkit store + slices
        ├── lib/            # API client, socket client
        └── types/          # TypeScript type definitions
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account
- Stripe account (optional)

### 1. Clone & Install

```bash
git clone <repo-url>
cd restaurantOS

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Environment Variables

**backend/.env**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/restaurantOS
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

FRONTEND_URL=http://localhost:3000
```

**frontend/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Seed the Database

```bash
cd backend
npm run seed
```

Creates: 1 admin user, sample categories, sample menu items, 10 tables with QR codes.

**Default admin credentials:**
- Email: `admin@restaurantos.com`
- Password: `Admin1234!`

### 4. Run Development

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- Customer Menu: `http://localhost:3000/menu?table=TABLE_ID`
- Admin Dashboard: `http://localhost:3000/admin`
- Kitchen Display: `http://localhost:3000/kitchen`

---

## 🗄️ Database Schema Overview

| Collection | Purpose |
|---|---|
| `users` | Admin, staff, kitchen staff with JWT auth |
| `tables` | Restaurant tables with unique QR code URLs |
| `categories` | Menu categories (Starters, Mains, Drinks…) |
| `menuItems` | Food items with images, price, availability |
| `orders` | Customer orders linked to table + items |
| `payments` | Payment records linked to orders |

---

## 🔌 API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/auth/register` | Admin | Create staff/kitchen user |
| GET | `/api/menu` | — | Get full menu with categories |
| GET | `/api/menu/items` | — | Get all menu items (filterable) |
| POST | `/api/menu/items` | Admin | Create menu item |
| PUT | `/api/menu/items/:id` | Admin | Update menu item |
| DELETE | `/api/menu/items/:id` | Admin | Delete menu item |
| GET | `/api/categories` | — | Get all categories |
| POST | `/api/categories` | Admin | Create category |
| GET | `/api/tables` | Admin | Get all tables |
| POST | `/api/tables` | Admin | Create table + generate QR |
| GET | `/api/tables/:id/qr` | Admin | Get QR code image |
| POST | `/api/orders` | — | Place order (from table) |
| GET | `/api/orders` | Staff | Get all orders |
| GET | `/api/orders/:id` | — | Get single order |
| PUT | `/api/orders/:id/status` | Kitchen | Update order status |
| GET | `/api/orders/table/:tableId` | — | Get orders for a table |
| POST | `/api/payments/initiate` | — | Start payment (Stripe/MPesa) |
| POST | `/api/payments/webhook` | — | Stripe webhook handler |
| GET | `/api/analytics/revenue` | Admin | Revenue analytics |
| GET | `/api/analytics/orders` | Admin | Order stats |

---

## ⚡ Socket.io Events

| Event | Direction | Payload |
|---|---|---|
| `new_order` | Server → Kitchen, Admin | `{ order }` |
| `order_status_updated` | Server → Customer, Admin | `{ orderId, status, tableId }` |
| `payment_success` | Server → Customer | `{ orderId, tableId }` |
| `join_table` | Client → Server | `{ tableId }` |
| `join_kitchen` | Client → Server | — |
| `join_admin` | Client → Server | — |

---

## 🚢 Deployment

### Frontend → Vercel
```bash
cd frontend
vercel deploy --prod
```

### Backend → Railway/Render
```bash
# Set all env vars in Railway dashboard
# Connect GitHub repo → auto-deploy
```

### Database → MongoDB Atlas
- Create free M0 cluster
- Whitelist Railway/Render IP or use 0.0.0.0/0
- Use connection string in `MONGODB_URI`

---

## 📱 User Flows

### Customer Flow
1. Scan QR code at table
2. Menu opens in browser (no app install)
3. Browse categories, search items, view details
4. Add to cart (persisted in Redux + localStorage)
5. Checkout with name + payment method
6. Real-time order tracking via Socket.io
7. Receive notification when order is ready

### Kitchen Flow
1. Open `/kitchen` on tablet/display
2. New orders appear instantly via Socket.io
3. Tap order → mark as **Preparing**
4. Tap again → mark as **Ready**
5. Customer sees status update live

### Admin Flow
1. Login at `/admin`
2. Manage menu items (CRUD + Cloudinary images)
3. Manage categories and tables
4. View live orders
5. Generate/download QR codes per table
6. View revenue and order analytics

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| State | Redux Toolkit, RTK Query |
| Real-time | Socket.io client |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcrypt |
| Images | Cloudinary |
| Payments | Stripe, M-Pesa simulation |
| QR Codes | qrcode npm package |
| Validation | Zod |
| Deployment | Vercel + Railway + MongoDB Atlas |
