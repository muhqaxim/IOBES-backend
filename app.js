require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/authRoutes");
const facultyRoutes = require("./src/routes/facultyRoutes");
const contentRoutes = require("./src/routes/contentRoutes");
const cloRoutes = require("./src/routes/cloRoutes");
const geminiRoutes = require("./src/routes/geminiRoutes");
const { generateAssessment } = require('./src/controllers/assessmentController');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/clo", cloRoutes);
app.use("/api/gemini", geminiRoutes);
router.post('/api/assessment', generateAssessment);

// Root route
app.get("/", (req, res) => {
  res.send("Education Management System API is running");
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error", error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
