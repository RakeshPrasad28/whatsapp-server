import { Request } from "express";
import { Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password: string;
  avatar: string;
  about: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface IChat extends Document {
  _id: Types.ObjectId;
  chatName: string;
  isGroupChat: boolean;
  users: Types.ObjectId[] | IUser[];
  latestMessage?: Types.ObjectId | IMessage;
  groupAdmin?: Types.ObjectId | IUser;
  groupAvatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  sender: Types.ObjectId | IUser;
  content: string;
  chat: Types.ObjectId | IChat;
  messageType: "text" | "image" | "file" | "audio" | "video";
  mediaUrl?: string;
  readBy: Types.ObjectId[] | IUser[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}
