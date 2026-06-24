# 🚀 Smart Queue Management System

A full-stack real-time queue management platform built with **React**, **Node.js**, **Express.js**, **PostgreSQL**, and **Socket.IO**.

Smart Queue eliminates physical waiting lines by allowing users to join, monitor, and manage queues digitally with live updates. The system provides role-based access control, real-time queue tracking, concurrency-safe operations, and scalable architecture suitable for real-world deployment.

---

## 🌟 Features

### 👤 Client Features

- Register and Login securely
- Join active queues
- View live queue status
- Track:
  - Current serving customer
  - Personal queue position
  - Number of people ahead
  - Total waiting customers
- Cancel queue entry
- Receive real-time queue updates
- Auto-refresh queue status through WebSockets

### 🏢 Host Features

- Create queues
- View queue dashboard
- Monitor active queue statistics
- Serve next customer
- End queue
- Track served and waiting customers
- Receive real-time queue activity updates

### ⚡ Real-Time Features

- Built using Socket.IO
- Queue-specific rooms
- Instant queue updates
- No polling required
- Live synchronization across multiple clients

---

## ✨ Highlights

- Real-time queue tracking using WebSockets
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Protected frontend routes
- React Context API for authentication state management
- PostgreSQL transaction management
- Race condition prevention using row-level locking
- Queue-specific Socket.IO rooms
- Full-stack architecture
- Production deployment ready
- Scalable design ready for Redis integration

---

## 🏗️ System Architecture

```text
                ┌─────────────────────┐
                │     React Client    │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │    Express APIs     │
                └──────────┬──────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
    ┌──────────────┐             ┌────────────────┐
    │ PostgreSQL   │             │   Socket.IO    │
    │  Database    │             │ Real-Time Layer│
    └──────────────┘             └────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

- React.js
- Vite
- React Router DOM
- Context API
- Axios
- Socket.IO Client

### Backend

- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- Socket.IO

### Database

- PostgreSQL

### Authentication

- JWT (JSON Web Tokens)
- Role-Based Access Control (RBAC)

### Real-Time Communication

- Socket.IO

---

## 📂 Project Structure

```text
smartqueue/
│
├── smartqueuebackend/
│   │
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── queue.controller.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── role.middleware.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── queue.routes.js
│   │
│   ├── socket/
│   │   └── socket.js
│   │
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── smartqueuefrontend/
    │
    ├── public/
    │
    ├── src/
    │   │
    │   ├── api/
    │   │   ├── authApi.js
    │   │   └── queueApi.js
    │   │
    │   ├── assets/
    │   │
    │   ├── components/
    │   │   └── ProtectedRoute.jsx
    │   │
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   │
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── HostDashboard.jsx
    │   │   └── ClientDashboard.jsx
    │   │
    │   ├── socket/
    │   │   └── socket.js
    │   │
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   └── main.jsx
    │
    ├── package.json
    ├── vite.config.js
    └── .env
```

---

## 🔐 User Roles

### Host

A Host can:

- Create queues
- View queue analytics
- Serve next customer
- End queues
- Monitor queue activity

### Client

A Client can:

- Join queues
- Monitor queue progress
- Cancel queue entries
- Receive real-time updates

---

## ⚡ Queue Workflow

### Queue Creation

1. Host logs in.
2. Host creates a new queue.
3. Queue becomes available to clients.

### Queue Joining

1. Client logs in.
2. Client joins an active queue.
3. System assigns queue position.
4. Client receives queue status instantly.

### Serving Customers

1. Host clicks "Serve Next".
2. First waiting customer is marked as served.
3. Queue status updates instantly.
4. All connected clients receive updated information.

### Queue Completion

1. Host ends the queue.
2. Queue becomes inactive.
3. New users can no longer join.

---

## 🔄 Real-Time Communication

The system uses Socket.IO Rooms.

Each queue automatically gets a dedicated room:

```text
queue_1
queue_2
queue_3
...
```

When users join a queue:

```javascript
socket.emit("join_queue_room", queueId);
```

The server places them into:

```javascript
socket.join(`queue_${queueId}`);
```

This ensures only relevant users receive queue updates.

---

## 🛡️ Concurrency Handling

The system safely handles multiple users joining simultaneously.

### Database Transactions

Critical operations use PostgreSQL transactions:

```sql
BEGIN;
...
COMMIT;
```

### Row-Level Locking

Queue serving operations use:

```sql
FOR UPDATE
```

This prevents race conditions where multiple requests attempt to serve the same customer simultaneously.

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|----------|----------|----------|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login user |

---

### Queue Management

| Method | Endpoint | Description |
|----------|----------|----------|
| POST | `/queues` | Create queue |
| POST | `/queues/:id/join` | Join queue |
| PATCH | `/queues/entry/:entryId/cancel` | Cancel queue entry |
| POST | `/queues/:id/serve` | Serve next customer |
| PATCH | `/queues/:queueId/end` | End queue |
| GET | `/queues/:queueId/me` | Client queue status |
| GET | `/queues/:queueId/status` | Host queue dashboard |

---

## 🎯 Key Concepts Implemented

### Authentication & Authorization

- JWT Authentication
- Protected Routes
- Role-Based Access Control

### Database

- PostgreSQL
- Transactions
- Constraints
- Relational Design

### Real-Time Systems

- Socket.IO
- Rooms
- Event Broadcasting

### Backend Engineering

- REST APIs
- Middleware Architecture
- Error Handling
- Business Logic Separation

### Scalability

- Queue Room Isolation
- Efficient Broadcasting
- Redis-Ready Architecture

---

## 🚀 Getting Started

### Clone Repository

```bash
git clone https://github.com/yourusername/smartqueue.git
```

### Backend Setup

```bash
cd smartqueuebackend
npm install
```

Create `.env`

```env
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
```

Run backend:

```bash
npm start
```

---

### Frontend Setup

```bash
cd smartqueuefrontend
npm install
```

Create `.env`

```env
VITE_API_URL=http://localhost:5000
```

Run frontend:

```bash
npm run dev
```

---

## 🔮 Future Enhancements

- Redis Pub/Sub
- Estimated Waiting Time Prediction
- Push Notifications
- QR Code Queue Joining
- Multi-Branch Queue Management
- Admin Dashboard
- Docker Deployment
- Kubernetes Scaling
- Queue Analytics
- Mobile Application

---

## 📸 Screenshots

Add screenshots of:

- Login Page
- Registration Page
- Host Dashboard
- Client Dashboard
- Real-Time Queue Updates

---

## 🧠 What I Learned

Through this project I gained hands-on experience with:

- Full-Stack Development
- React Architecture
- Backend API Design
- PostgreSQL Transactions
- Concurrency Control
- WebSockets
- Real-Time Systems
- Authentication & Authorization
- Scalable Application Design

---

## 👨‍💻 Author

### Gautam Yadav

Full-Stack Developer | Problem Solver | Competitive Programmer

Built to explore real-time systems, backend engineering, concurrency handling, and scalable queue management architectures.

---

⭐ If you found this project helpful, please consider giving it a star.
