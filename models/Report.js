import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: String,
  latitude: Number,
  longitude: Number,
  address: String,
  photoUrl: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Report", ReportSchema);
