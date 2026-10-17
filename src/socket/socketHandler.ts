import { Server as SocketIOServer, Socket } from "socket.io";
import { User } from "../models/User";

// Map to track active sockets per user: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();

export const setupSocketIO = (io: SocketIOServer): void => {
  io.on("connection", (socket: Socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    let currentUserId: string | null = null;

    // User setup / authentication
    socket.on("setup", async (userData: { _id?: string; id?: string }) => {
      const userId = userData?._id || userData?.id;
      if (!userId) return;

      currentUserId = userId.toString();
      socket.join(currentUserId);

      // Track socket in onlineUsers map
      if (!onlineUsers.has(currentUserId)) {
        onlineUsers.set(currentUserId, new Set());
      }
      onlineUsers.get(currentUserId)!.add(socket.id);

      try {
        // Update user status in DB to online
        await User.findByIdAndUpdate(currentUserId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        // Broadcast to all clients that user is online
        io.emit("user_status", {
          userId: currentUserId,
          isOnline: true,
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error("Error updating user online status:", err);
      }

      socket.emit("connected");
      console.log(`👤 User connected to room: ${currentUserId}`);
    });

    // Join a specific chat room (1-to-1 or group)
    socket.on("join_chat", (chatId: string) => {
      if (!chatId) return;
      socket.join(chatId);
      console.log(`💬 Socket ${socket.id} joined chat room: ${chatId}`);
    });

    // Leave a specific chat room
    socket.on("leave_chat", (chatId: string) => {
      if (!chatId) return;
      socket.leave(chatId);
      console.log(`🚪 Socket ${socket.id} left chat room: ${chatId}`);
    });

    // Real-time typing indicators
    socket.on(
      "typing",
      (data: { chatId: string; userId: string; userName?: string }) => {
        if (!data?.chatId) return;
        socket.to(data.chatId).emit("typing", data);
      }
    );

    socket.on("stop_typing", (data: { chatId: string; userId: string }) => {
      if (!data?.chatId) return;
      socket.to(data.chatId).emit("stop_typing", data);
    });

    // Real-time new message dispatch
    socket.on("new_message", (newMessageReceived: any) => {
      const chat = newMessageReceived?.chat;

      if (!chat || !chat.users) {
        return console.warn("Chat or chat.users not defined in message");
      }

      // Send to the chat room
      socket.to(chat._id).emit("message_received", newMessageReceived);

      // Also notify individual user personal rooms (for badges / notifications outside current open chat)
      chat.users.forEach((user: any) => {
        const targetUserId = typeof user === "string" ? user : user._id?.toString();
        const senderId =
          typeof newMessageReceived.sender === "string"
            ? newMessageReceived.sender
            : newMessageReceived.sender?._id?.toString();

        if (targetUserId && targetUserId !== senderId) {
          socket.to(targetUserId).emit("notification_received", newMessageReceived);
        }
      });
    });

    // Real-time message read receipts (blue ticks)
    socket.on("messages_read", (data: { chatId: string; readerId: string }) => {
      if (!data?.chatId) return;
      socket.to(data.chatId).emit("messages_read", data);
    });

    // Socket disconnection
    socket.on("disconnect", async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSockets = onlineUsers.get(currentUserId)!;
        userSockets.delete(socket.id);

        // If user has no more open tabs/sockets, mark them offline
        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);
          const lastSeenTime = new Date();

          try {
            await User.findByIdAndUpdate(currentUserId, {
              isOnline: false,
              lastSeen: lastSeenTime,
            });

            // Broadcast offline status
            io.emit("user_status", {
              userId: currentUserId,
              isOnline: false,
              lastSeen: lastSeenTime,
            });
          } catch (err) {
            console.error("Error setting user offline:", err);
          }
        }
      }
    });
  });
};
