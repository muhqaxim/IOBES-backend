const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CLOController {
  // Get all CLOs with optional filtering
  async getAllCLOs(req, res) {
    try {
      const { courseId } = req.query;
      
      const filter = {};
      if (courseId) filter.courseId = courseId;
      
      const clos = await prisma.cLO.findMany({
        where: filter,
        include: {
          course: true
        },
        orderBy: [
          { courseId: 'asc' },
          { number: 'asc' }
        ]
      });
      
      return res.status(200).json(clos);
    } catch (error) {
      console.error('Error fetching CLOs:', error);
      return res.status(500).json({ error: 'Failed to fetch CLOs' });
    }
  }

  // Get single CLO by ID
  async getCLOById(req, res) {
    try {
      const { id } = req.params;
      
      const clo = await prisma.cLO.findUnique({
        where: { id },
        include: {
          course: true
        }
      });
      
      if (!clo) {
        return res.status(404).json({ error: 'CLO not found' });
      }
      
      return res.status(200).json(clo);
    } catch (error) {
      console.error('Error fetching CLO:', error);
      return res.status(500).json({ error: 'Failed to fetch CLO' });
    }
  }

  // Create a new CLO
  async createCLO(req, res) {
    try {
      const { description, number, courseId } = req.body;
      
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // Check if CLO number already exists for this course
      const existingCLO = await prisma.cLO.findFirst({
        where: {
          courseId,
          number
        }
      });
      
      if (existingCLO) {
        return res.status(409).json({ error: `CLO ${number} already exists for this course` });
      }
      
      const newCLO = await prisma.cLO.create({
        data: {
          description,
          number,
          courseId
        },
        include: {
          course: true
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'CREATE_CLO',
          metadata: {
            cloId: newCLO.id,
            cloNumber: newCLO.number,
            courseId: newCLO.courseId
          }
        }
      });
      
      return res.status(201).json(newCLO);
    } catch (error) {
      console.error('Error creating CLO:', error);
      return res.status(500).json({ error: 'Failed to create CLO' });
    }
  }

  // Update a CLO
  async updateCLO(req, res) {
    try {
      const { id } = req.params;
      const { description, number } = req.body;
      
      // Check if CLO exists
      const existingCLO = await prisma.cLO.findUnique({
        where: { id }
      });
      
      if (!existingCLO) {
        return res.status(404).json({ error: 'CLO not found' });
      }
      
      // If updating number, check if it conflicts with another CLO
      if (number && number !== existingCLO.number) {
        const conflictingCLO = await prisma.cLO.findFirst({
          where: {
            courseId: existingCLO.courseId,
            number,
            id: { not: id }
          }
        });
        
        if (conflictingCLO) {
          return res.status(409).json({ error: `CLO ${number} already exists for this course` });
        }
      }
      
      // Prepare update data
      const updateData = {};
      if (description) updateData.description = description;
      if (number) updateData.number = number;
      
      const updatedCLO = await prisma.cLO.update({
        where: { id },
        data: updateData,
        include: {
          course: true
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'UPDATE_CLO',
          metadata: {
            cloId: id,
            updatedFields: Object.keys(updateData)
          }
        }
      });
      
      return res.status(200).json(updatedCLO);
    } catch (error) {
      console.error('Error updating CLO:', error);
      return res.status(500).json({ error: 'Failed to update CLO' });
    }
  }

  // Delete a CLO
  async deleteCLO(req, res) {
    try {
      const { id } = req.params;
      
      // Check if CLO exists
      const existingCLO = await prisma.cLO.findUnique({
        where: { id },
        include: {
          course: {
            select: {
              name: true,
              code: true
            }
          }
        }
      });
      
      if (!existingCLO) {
        return res.status(404).json({ error: 'CLO not found' });
      }
      
      // Delete the CLO
      await prisma.cLO.delete({
        where: { id }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'DELETE_CLO',
          metadata: {
            deletedCloId: id,
            cloNumber: existingCLO.number,
            courseId: existingCLO.courseId,
            courseName: existingCLO.course.name,
            courseCode: existingCLO.course.code
          }
        }
      });
      
      return res.status(200).json({ message: 'CLO deleted successfully' });
    } catch (error) {
      console.error('Error deleting CLO:', error);
      return res.status(500).json({ error: 'Failed to delete CLO' });
    }
  }

  // Bulk create CLOs for a course
  async bulkCreateCLOs(req, res) {
    try {
      const { courseId, clos } = req.body;
      
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // Check for duplicate CLO numbers in the request
      const cloNumbers = clos.map(clo => clo.number);
      if (new Set(cloNumbers).size !== cloNumbers.length) {
        return res.status(400).json({ error: 'Duplicate CLO numbers in request' });
      }
      
      // Check if any CLO numbers already exist for this course
      const existingCLOs = await prisma.cLO.findMany({
        where: {
          courseId,
          number: { in: cloNumbers }
        }
      });
      
      if (existingCLOs.length > 0) {
        const existingNumbers = existingCLOs.map(clo => clo.number);
        return res.status(409).json({ 
          error: 'Some CLO numbers already exist for this course',
          existingNumbers
        });
      }
      
      // Create all CLOs in a transaction
      const createdCLOs = await prisma.$transaction(
        clos.map(clo => 
          prisma.cLO.create({
            data: {
              description: clo.description,
              number: clo.number,
              courseId
            }
          })
        )
      );
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'BULK_CREATE_CLOS',
          metadata: {
            courseId,
            count: createdCLOs.length,
            cloIds: createdCLOs.map(clo => clo.id)
          }
        }
      });
      
      return res.status(201).json(createdCLOs);
    } catch (error) {
      console.error('Error bulk creating CLOs:', error);
      return res.status(500).json({ error: 'Failed to bulk create CLOs' });
    }
  }
}

module.exports = new CLOController();