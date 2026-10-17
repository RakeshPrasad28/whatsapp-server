import { Router } from "express";
import {
  sendMessage,
  allMessages,
  markChatMessagesAsRead,
} from "../controllers/messageController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.route("/").post(protect, sendMessage);
router.route("/:chatId").get(protect, allMessages);
router.route("/read/:chatId").put(protect, markChatMessagesAsRead);

export default router;
