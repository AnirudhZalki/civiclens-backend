import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  address: { type: String },
  photoUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Report", ReportSchema);
