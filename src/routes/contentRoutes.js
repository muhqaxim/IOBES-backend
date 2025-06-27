// routes/contentRoutes.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

// Create new content (Assignment, Quiz, Exam)
router.post('/', contentController.createContent);

// Get all content by course ID and faculty ID
router.get('/course/:courseId/faculty/:facultyId', contentController.getContentByCourseAndFaculty);

// Get all content by faculty ID only
router.get('/faculty/:facultyId', contentController.getContentByFaculty);

// Get single content by ID
router.get('/:id', contentController.getContentById);

router.delete('/:id', contentController.deleteContent); // New route to handle DELETE

module.exports = router;