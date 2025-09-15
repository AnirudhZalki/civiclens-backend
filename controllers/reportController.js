import Report from "../models/Report.js";

export const createReport = async (req, res) => {
  try {
    const { title, description, latitude, longitude, address } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });

    const photoUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;

    const report = new Report({
      user: req.user._id,
      title,
      description,
      latitude,
      longitude,
      address,
      photoUrl
    });

    await report.save();
    await report.populate("user", "name email");

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).populate("user", "name email");
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
