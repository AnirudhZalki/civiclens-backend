// index.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json()); // parse json bodies

// --- static uploads folder ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));

// --- MongoDB connect ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(()=>console.log("✅ MongoDB connected"))
.catch(err=>{ console.error("❌ Mongo connect error:", err); process.exit(1); });

// --- Models ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", UserSchema);

const ReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: String,
  latitude: Number,
  longitude: Number,
  address: String,
  photoUrl: String, // full URL to access
  createdAt: { type: Date, default: Date.now }
});
const Report = mongoose.model("Report", ReportSchema);

// --- Multer for file uploads ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random()*1e9) + ext);
  }
});
const upload = multer({ storage });

// --- Auth helpers ---
const JWT_SECRET = process.env.JWT_SECRET || "replace_this_secret";
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ error: "No token" });

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ error: "Invalid token (user not found)" });

    req.user = user; // attach user
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid/expired token", details: err.message });
  }
};

// --- Routes ---

app.get("/", (req, res) => res.send("CivicLens backend running ✅"));

// AUTH: register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    const safeUser = { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt };
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// AUTH: login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    const safeUser = { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt };
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// AUTH: get current user
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// REPORTS: submit (protected) — note middleware order: auth then multer
app.post("/api/reports", authMiddleware, upload.single("photo"), async (req, res) => {
  try {
    const { title, description, latitude, longitude, address } = req.body || {};
    if (!title) return res.status(400).json({ error: "Title required" });

    const photoUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;

    const report = new Report({
      user: req.user._id,
      title,
      description,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      address,
      photoUrl
    });

    await report.save();
    // populate user minimal info in response
    await report.populate("user", "name email");
    res.json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Get all reports (public) — with user info
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).populate("user", "name email");
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Get only current user's reports (protected)
app.get("/api/reports/mine", authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Server running on ${PORT}`));
