import { Router } from "express";
import {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  searchUsers,
} from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.get("/users", protect, searchUsers);

export default router;
