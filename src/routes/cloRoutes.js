const express = require("express");
const router = express.Router();
const cloController = require("../controllers/cloController");

// Get all CLOs for a course
router.get("/course/:courseId", cloController.getCLOById);

// Create a new CLO
router.post("/", cloController.createCLO);

// Update an existing CLO
router.put("/:id", cloController.updateCLO);

// Delete a CLO
router.delete("/:id", cloController.deleteCLO);

module.exports = router;
