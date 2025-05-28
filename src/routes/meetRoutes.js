import express from "express";
import { createMeet, getMeetInfo } from "../controllers/meetController.js";
import authMiddleware from "../middlewares/authMiidleware.js";

const router = express.Router();
router.use(authMiddleware);

router.post("/create-meet", createMeet);
router.post("/get-meet-info", getMeetInfo);

export default router;
