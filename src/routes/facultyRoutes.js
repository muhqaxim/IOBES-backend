const express = require("express");
const router = express.Router();
const userController = require("../controllers/facultyController");

router.get("/", userController.getAllFaculty);
router.get("/:id", userController.getFacultyById);
router.post("/", userController.createFaculty);
router.put("/:id", userController.updateFaculty);
router.delete("/:id", userController.deleteFaculty);

module.exports = router;
