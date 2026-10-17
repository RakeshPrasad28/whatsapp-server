import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./src/app";
import { connectDB } from "./src/config/db";
import { setupSocketIO } from "./src/socket/socketHandler";

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new SocketIOServer(server, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CLIENT_URL === "*" ? "*" : process.env.CLIENT_URL?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Initialize Socket events
setupSocketIO(io);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket server is ready`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
