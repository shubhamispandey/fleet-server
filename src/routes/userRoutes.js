import express from "express";
import authMiddleware from "../middlewares/authMiidleware.js";
import {
  getAllUsers,
  getCurrentUser,
  getUserById,
  searchUsers,
  updateUser,
} from "../controllers/userController.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", getAllUsers);
router.get("/me", getCurrentUser);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.get("/search", searchUsers);

export default router;
