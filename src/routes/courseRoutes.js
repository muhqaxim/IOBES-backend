const express = require("express");
const router = express.Router();
const courseController = require("..//controllers/courseController");

router.get("/", courseController.getAllCourses);
router.get("/:id", courseController.getCourseById);
router.post("/", courseController.createCourse);
router.put("/:id", courseController.updateCourse);
router.delete("/:id", courseController.deleteCourse);
router.post("/assign-faculty", courseController.assignFacultyToCourse);
router.post("/remove-faculty", courseController.removeFacultyFromCourse);
router.get("/faculty/:facultyId", courseController.getCourseByFaculty);

module.exports = router;
