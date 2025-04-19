const express = require('express');
const router = express.Router();
const { authenticate, isFaculty } = require('../middleware/auth');
const contentController = require('../controllers/contentController');
const courseController = require('../controllers/courseController');

// Apply middleware to all routes
router.use(authenticate, isFaculty);

// Get assigned courses
router.get('/courses', async (req, res) => {
  try {
    const facultyId = req.user.id;
    
    const courses = await prisma.course.findMany({
      where: {
        faculty: {
          some: {
            id: facultyId
          }
        }
      },
      include: {
        clos: true
      }
    });
    
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Content management routes
router.get('/content', contentController.getAllContentByFaculty);
router.get('/content/:id', contentController.getContentById);
router.post('/content', contentController.createContent);
router.put('/content/:id', contentController.updateContent);
router.delete('/content/:id', contentController.deleteContent);
router.post('/content/generate', contentController.generateContentAI);

module.exports = router;
