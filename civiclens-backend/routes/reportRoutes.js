import express from "express";
import multer from "multer";
import path from "path";
import { createReport, getAllReports, getMyReports } from "../controllers/reportController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.post("/", authMiddleware, upload.single("photo"), createReport);
router.get("/", getAllReports);
router.get("/mine", authMiddleware, getMyReports);

export default router;
