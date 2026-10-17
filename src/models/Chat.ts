import mongoose, { Schema } from "mongoose";
import { IChat } from "../types";

const chatSchema = new Schema<IChat>(
  {
    chatName: {
      type: String,
      trim: true,
      default: "",
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    latestMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    groupAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    groupAvatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Chat = mongoose.model<IChat>("Chat", chatSchema);
