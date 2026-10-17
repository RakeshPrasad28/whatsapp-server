import { Response } from "express";
import { Chat } from "../models/Chat";
import { User } from "../models/User";
import { AuthenticatedRequest } from "../types";

// @desc    Create or access a 1-to-1 chat
// @route   POST /api/chats
// @access  Private
export const accessChat = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ message: "userId param not sent with request" });
      return;
    }

    if (userId === req.user?._id.toString()) {
      res.status(400).json({ message: "You cannot create a chat with yourself" });
      return;
    }

    // Check if 1-to-1 chat already exists
    const isChat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [req.user?._id, userId] },
    })
      .populate("users", "-password")
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          select: "name avatar email isOnline lastSeen",
        },
      });

    if (isChat) {
      res.json(isChat);
      return;
    }

    // If chat doesn't exist, create it
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ message: "Recipient user not found" });
      return;
    }

    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user?._id, userId],
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findById(createdChat._id).populate(
      "users",
      "-password"
    );

    res.status(201).json(fullChat);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to access chat" });
  }
};

// @desc    Fetch all chats for current logged-in user
// @route   GET /api/chats
// @access  Private
export const fetchChats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user?._id } },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          select: "name avatar email isOnline lastSeen",
        },
      })
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch chats" });
  }
};

// @desc    Create a new Group Chat
// @route   POST /api/chats/group
// @access  Private
export const createGroupChat = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, users: rawUsers, groupAvatar } = req.body;

    if (!name || !rawUsers) {
      res.status(400).json({ message: "Please fill all required fields: name and users" });
      return;
    }

    let parsedUsers: string[] = [];
    if (typeof rawUsers === "string") {
      try {
        parsedUsers = JSON.parse(rawUsers);
      } catch {
        parsedUsers = [rawUsers];
      }
    } else if (Array.isArray(rawUsers)) {
      parsedUsers = rawUsers;
    }

    if (parsedUsers.length < 2) {
      res.status(400).json({
        message: "More than 2 users are required to form a group chat",
      });
      return;
    }

    // Add current user to users list if not already present
    const currentUserIdStr = req.user?._id.toString();
    if (currentUserIdStr && !parsedUsers.includes(currentUserIdStr)) {
      parsedUsers.push(currentUserIdStr);
    }

    const groupChat = await Chat.create({
      chatName: name,
      users: parsedUsers,
      isGroupChat: true,
      groupAdmin: req.user?._id,
      groupAvatar:
        groupAvatar ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(201).json(fullGroupChat);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create group chat" });
  }
};

// @desc    Rename Group Chat
// @route   PUT /api/chats/group/rename
// @access  Private
export const renameGroup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId, chatName } = req.body;

    if (!chatId || !chatName) {
      res.status(400).json({ message: "chatId and chatName are required" });
      return;
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!updatedChat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    res.json(updatedChat);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to rename group" });
  }
};

// @desc    Add member to Group Chat
// @route   PUT /api/chats/group/add
// @access  Private
export const addToGroup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      res.status(400).json({ message: "chatId and userId are required" });
      return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    if (!chat.isGroupChat) {
      res.status(400).json({ message: "This chat is not a group chat" });
      return;
    }

    // Check if user is already in group
    const alreadyMember = chat.users.some(
      (u: any) => u.toString() === userId.toString()
    );
    if (alreadyMember) {
      res.status(400).json({ message: "User is already a member of this group" });
      return;
    }

    const added = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.json(added);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to add member to group" });
  }
};

// @desc    Remove member from Group Chat or leave group
// @route   PUT /api/chats/group/remove
// @access  Private
export const removeFromGroup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      res.status(400).json({ message: "chatId and userId are required" });
      return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }

    if (!chat.isGroupChat) {
      res.status(400).json({ message: "This chat is not a group chat" });
      return;
    }

    // Only group admin or the user themselves leaving is allowed
    const isSelfLeaving = req.user?._id.toString() === userId.toString();
    const isAdmin = chat.groupAdmin?.toString() === req.user?._id.toString();

    if (!isSelfLeaving && !isAdmin) {
      res.status(403).json({
        message: "Only group admin can remove other members from the group",
      });
      return;
    }

    const removed = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.json(removed);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove member from group" });
  }
};
