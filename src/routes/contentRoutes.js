const express = require("express");
const router = express.Router();
const contentController = require("../controllers/contentController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// Get all content created by the faculty
router.get("/", contentController.getAllContentByFaculty);

// Get specific content by ID (faculty-owned)
router.get("/:id", contentController.getContentById);

// Create new content (optionally auto-generating)
router.post("/", contentController.createContent);

// Update existing content
router.put("/:id", contentController.updateContent);

// Delete content
router.delete("/:id", contentController.deleteContent);

// Generate content via AI only (for preview or manual use)
router.post("/generate/ai", contentController.generateContentAI);

module.exports = router;
