import { Response } from "express";
import { Message } from "../models/Message";
import { Chat } from "../models/Chat";
import { AuthenticatedRequest } from "../types";

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { content, chatId, messageType = "text", mediaUrl = "" } = req.body;

    if (!chatId || (!content && !mediaUrl)) {
      res.status(400).json({
        message: "Invalid message data: chatId and content or mediaUrl are required",
      });
      return;
    }

    const currentUserId = req.user?._id;
    if (!currentUserId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify chat exists and user is a member
    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    const isMember = chat.users.some(
      (u: any) => u.toString() === currentUserId.toString()
    );
    if (!isMember) {
      res.status(403).json({ message: "You are not a member of this chat" });
      return;
    }

    const createdMessage = await Message.create({
      sender: currentUserId,
      content: content || "",
      chat: chatId,
      messageType,
      mediaUrl,
      readBy: [currentUserId],
    });

    const populatedMessage = await Message.findById(createdMessage._id)
      .populate("sender", "name avatar email isOnline lastSeen")
      .populate({
        path: "chat",
        populate: {
          path: "users",
          select: "name avatar email isOnline lastSeen",
        },
      });

    // Update latestMessage in Chat
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: createdMessage._id,
    });

    res.status(201).json(populatedMessage);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to send message" });
  }
};

// @desc    Get all messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
export const allMessages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Check if chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    const isMember = chat.users.some(
      (u: any) => u.toString() === currentUserId.toString()
    );
    if (!isMember) {
      res.status(403).json({ message: "You do not have access to this chat" });
      return;
    }

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "name avatar email isOnline lastSeen")
      .populate("chat")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch messages" });
  }
};

// @desc    Mark messages in a chat as read
// @route   PUT /api/messages/read/:chatId
// @access  Private
export const markChatMessagesAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
      }
    );

    res.json({ success: true, message: "Messages marked as read" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to mark messages as read" });
  }
};
