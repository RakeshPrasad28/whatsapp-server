import { Response } from "express";
import { User } from "../models/User";
import { generateToken } from "../utils/generateToken";
import { AuthenticatedRequest } from "../types";

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password, phone, avatar, about } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: "Please provide name, email, and password" });
      return;
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: "User with this email already exists" });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || "",
      avatar:
        avatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      about: about || "Hey there! I am using WhatsApp.",
      isOnline: true,
      lastSeen: new Date(),
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      about: user.about,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      token: generateToken(user._id),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to register user" });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Please provide email and password" });
      return;
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      about: user.about,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      token: generateToken(user._id),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to login" });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch user profile" });
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { name, about, avatar, phone } = req.body;

    if (name) user.name = name;
    if (about !== undefined) user.about = about;
    if (avatar) user.avatar = avatar;
    if (phone !== undefined) user.phone = phone;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      about: updatedUser.about,
      isOnline: updatedUser.isOnline,
      lastSeen: updatedUser.lastSeen,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update profile" });
  }
};

// @desc    Search users or get all users (excluding logged in user)
// @route   GET /api/auth/users?search=nameOrEmail
// @access  Private
export const searchUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search as string, $options: "i" } },
            { email: { $regex: req.query.search as string, $options: "i" } },
            { phone: { $regex: req.query.search as string, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(keyword)
      .find({ _id: { $ne: req.user?._id } })
      .select("-password");

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to search users" });
  }
};
