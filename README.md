# WhatsApp Clone Backend (TypeScript + Express + MongoDB + Socket.IO)

Production-ready backend architecture for a WhatsApp-like messaging application supporting 1-to-1 chats, group chats, real-time messaging, typing indicators, read receipts, and user presence (online/offline/last seen).

---

## 🛠️ Tech Stack

- **Runtime & Language**: Node.js with TypeScript (`strict` mode)
- **Web Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-Time Engine**: Socket.IO
- **Security & Auth**: JWT (JSON Web Tokens) & `bcryptjs`
- **Execution Tool**: `tsx` (TypeScript Execution with live reload)

---

## 📁 Project Architecture

```
backend/
├── src/
│   ├── config/
│   │   └── db.ts                   # MongoDB Mongoose connection handler
│   ├── controllers/
│   │   ├── authController.ts       # Registration, login, profile, user search
│   │   ├── chatController.ts       # 1-to-1 chats, group creation, member management
│   │   └── messageController.ts    # Send message, get chat history, read status
│   ├── middleware/
│   │   ├── authMiddleware.ts       # JWT Bearer authentication guard
│   │   └── errorMiddleware.ts      # 404 and central error handler
│   ├── models/
│   │   ├── User.ts                 # User schema (avatar, status, credentials, presence)
│   │   ├── Chat.ts                 # Chat schema (1-to-1 & Group support)
│   │   └── Message.ts              # Message schema (text, media, readBy)
│   ├── routes/
│   │   ├── authRoutes.ts           # /api/auth
│   │   ├── chatRoutes.ts           # /api/chats
│   │   └── messageRoutes.ts        # /api/messages
│   ├── socket/
│   │   └── socketHandler.ts        # Socket.IO events (presence, typing, rooms, delivery)
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions and interfaces
│   └── app.ts                      # Express app setup and middleware pipeline
├── index.ts                        # Server entry point (HTTP + Socket.IO)
├── tsconfig.json                   # TypeScript compiler options
├── package.json
└── .env                            # Environment configurations
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (`.env`)
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=whatsapp_jwt_super_secret_key_2026_production
NODE_ENV=development
CLIENT_URL=*
```
*(Note: Port 5001 is used to avoid port 5000 conflicts with macOS ControlCenter/AirPlay)*

### 3. Start Development Server
```bash
npm run dev
```

---

## 📡 REST API Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | Login user & get JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (`Bearer <token>`) |
| `PUT` | `/api/auth/profile` | Update profile (name, avatar, about, phone) | Yes |
| `GET` | `/api/auth/users?search=` | Search users by name/email | Yes |

### 💬 Chats (`/api/chats`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/chats` | Create or access 1-to-1 chat (`{ userId }`) | Yes |
| `GET` | `/api/chats` | Fetch all user's chats (sorted by recent) | Yes |
| `POST` | `/api/chats/group` | Create group chat (`{ name, users, groupAvatar? }`) | Yes |
| `PUT` | `/api/chats/group/rename` | Rename group (`{ chatId, chatName }`) | Yes |
| `PUT` | `/api/chats/group/add` | Add user to group (`{ chatId, userId }`) | Yes |
| `PUT` | `/api/chats/group/remove`| Remove user / leave group (`{ chatId, userId }`) | Yes |

### ✉️ Messages (`/api/messages`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/messages` | Send message (`{ chatId, content, messageType, mediaUrl }`) | Yes |
| `GET` | `/api/messages/:chatId` | Fetch all messages for a chat | Yes |
| `PUT` | `/api/messages/read/:chatId` | Mark messages in chat as read (blue ticks) | Yes |

---

## ⚡ Socket.IO Real-Time Events

### Client -> Server:
- `setup` (`{ _id }`): Emitted on login/connect. Joins personal user room, marks user online.
- `join_chat` (`chatId`): Joins a specific chat room.
- `leave_chat` (`chatId`): Leaves a chat room.
- `typing` (`{ chatId, userId, userName }`): Broadcasts typing indicator to chat room.
- `stop_typing` (`{ chatId, userId }`): Stops typing indicator.
- `new_message` (`messageObject`): Sends message in real-time to room and notifies offline members.
- `messages_read` (`{ chatId, readerId }`): Notifies room participants that messages have been read.

### Server -> Client:
- `connected`: Handshake confirmation.
- `user_status` (`{ userId, isOnline, lastSeen }`): Broadcasts user status changes.
- `message_received` (`messageObject`): Emitted when a new message arrives in the current room.
- `notification_received` (`messageObject`): Direct notification to user's personal room when chat isn't currently open.
- `typing` / `stop_typing`: Displays or hides "typing..." in real-time.
- `messages_read`: Triggers blue tick status update in UI.
