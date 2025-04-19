const prisma = require('../config/db');

const getCLOsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const clos = await prisma.cLO.findMany({
      where: { courseId },
      orderBy: { number: 'asc' }
    });
    
    res.status(200).json(clos);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createCLO = async (req, res) => {
  try {
    const { description, number, courseId } = req.body;
    
    // Check if course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Create CLO
    const clo = await prisma.cLO.create({
      data: {
        description,
        number,
        courseId
      }
    });
    
    res.status(201).json({
      message: 'CLO created successfully',
      clo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateCLO = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, number } = req.body;
    
    const clo = await prisma.cLO.update({
      where: { id },
      data: {
        description,
        number
      }
    });
    
    res.status(200).json({
      message: 'CLO updated successfully',
      clo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteCLO = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.cLO.delete({ where: { id } });
    
    res.status(200).json({ message: 'CLO deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getCLOsByCourse,
  createCLO,
  updateCLO,
  deleteCLO
};