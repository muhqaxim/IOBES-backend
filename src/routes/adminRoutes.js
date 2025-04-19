const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');
const courseController = require('../controllers/courseController');
const cloController = require('../controllers/cloController');


router.use(authenticate, isAdmin);

router.get('/faculty', userController.getAllFaculty);
router.get('/faculty/:id', userController.getFacultyById);
router.post('/faculty', userController.createFaculty);
router.put('/faculty/:id', userController.updateFaculty);
router.delete('/faculty/:id', userController.deleteFaculty);

// Course management routes
router.get('/courses', courseController.getAllCourses);
router.get('/courses/:id', courseController.getCourseById);
router.post('/courses', courseController.createCourse);
router.put('/courses/:id', courseController.updateCourse);
router.delete('/courses/:id', courseController.deleteCourse);
router.post('/courses/assign-faculty', courseController.assignFacultyToCourse);
router.post('/courses/remove-faculty', courseController.removeFacultyFromCourse);

// CLO management routes
router.get('/clos/:courseId', cloController.getCLOsByCourse);
router.post('/clos', cloController.createCLO);
router.put('/clos/:id', cloController.updateCLO);
router.delete('/clos/:id', cloController.deleteCLO);

module.exports = router;
