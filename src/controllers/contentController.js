const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ContentController {
  // Get all content with optional filtering
  async getAllContent(req, res) {
    try {
      const { courseId, type, facultyId } = req.query;
      
      // Build filter object based on query parameters
      const filter = {};
      if (courseId) filter.courseId = courseId;
      if (type) filter.type = type;
      if (facultyId) filter.facultyId = facultyId;
      
      const contents = await prisma.content.findMany({
        where: filter,
        include: {
          course: true,
          faculty: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return res.status(200).json(contents);
    } catch (error) {
      console.error('Error fetching content:', error);
      return res.status(500).json({ error: 'Failed to fetch content' });
    }
  }

  // Get single content by ID
  async getContentById(req, res) {
    try {
      const { id } = req.params;
      
      const content = await prisma.content.findUnique({
        where: { id },
        include: {
          course: true,
          faculty: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }
      
      return res.status(200).json(content);
    } catch (error) {
      console.error('Error fetching content:', error);
      return res.status(500).json({ error: 'Failed to fetch content' });
    }
  }

  // Create content
  async createContent(req, res) {
    try {
      const { title, type, questions, courseId } = req.body;
      const facultyId = req.user.id; // Assuming req.user is set from auth middleware
      
      // Validate content type
      const validTypes = ['QUIZ', 'ASSIGNMENT', 'EXAM'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid content type' });
      }
      
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // Check if faculty is assigned to this course
      const facultyAssignment = await prisma.facultyCourseAssignment.findFirst({
        where: {
          facultyId,
          courseId
        }
      });
      
      if (!facultyAssignment && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'You are not assigned to this course' });
      }
      
      // Validate questions format based on content type
      if (!Array.isArray(questions) || !questions.length) {
        return res.status(400).json({ error: 'Questions must be a non-empty array' });
      }
      
      // Create the content
      const newContent = await prisma.content.create({
        data: {
          title,
          type,
          questions,
          courseId,
          facultyId
        },
        include: {
          course: true,
          faculty: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: facultyId,
          action: 'CREATE_CONTENT',
          metadata: {
            contentId: newContent.id,
            contentType: newContent.type,
            contentTitle: newContent.title,
            courseId
          }
        }
      });
      
      return res.status(201).json(newContent);
    } catch (error) {
      console.error('Error creating content:', error);
      return res.status(500).json({ error: 'Failed to create content' });
    }
  }

  // Update content
  async updateContent(req, res) {
    try {
      const { id } = req.params;
      const { title, type, questions } = req.body;
      const userId = req.user.id; // Assuming req.user is set from auth middleware
      
      // Check if content exists
      const existingContent = await prisma.content.findUnique({
        where: { id }
      });
      
      if (!existingContent) {
        return res.status(404).json({ error: 'Content not found' });
      }
      
      // Check if user has permission to update this content
      if (existingContent.facultyId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'You do not have permission to update this content' });
      }
      
      // Validate content type if updating
      if (type) {
        const validTypes = ['QUIZ', 'ASSIGNMENT', 'EXAM'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({ error: 'Invalid content type' });
        }
      }
      
      // Validate questions format if updating
      if (questions && (!Array.isArray(questions) || !questions.length)) {
        return res.status(400).json({ error: 'Questions must be a non-empty array' });
      }
      
      // Prepare update data
      const updateData = {};
      if (title) updateData.title = title;
      if (type) updateData.type = type;
      if (questions) updateData.questions = questions;
      
      // Update the content
      const updatedContent = await prisma.content.update({
        where: { id },
        data: updateData,
        include: {
          course: true,
          faculty: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'UPDATE_CONTENT',
          metadata: {
            contentId: id,
            updatedFields: Object.keys(updateData)
          }
        }
      });
      
      return res.status(200).json(updatedContent);
    } catch (error) {
      console.error('Error updating content:', error);
      return res.status(500).json({ error: 'Failed to update content' });
    }
  }

  // Delete content
  async deleteContent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // Assuming req.user is set from auth middleware
      
      // Check if content exists
      const existingContent = await prisma.content.findUnique({
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
      
      if (!existingContent) {
        return res.status(404).json({ error: 'Content not found' });
      }
      
      // Check if user has permission to delete this content
      if (existingContent.facultyId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'You do not have permission to delete this content' });
      }
      
      // Delete the content
      await prisma.content.delete({
        where: { id }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'DELETE_CONTENT',
          metadata: {
            deletedContentId: id,
            contentTitle: existingContent.title,
            contentType: existingContent.type,
            courseId: existingContent.courseId,
            courseName: existingContent.course.name,
            courseCode: existingContent.course.code
          }
        }
      });
      
      return res.status(200).json({ message: 'Content deleted successfully' });
    } catch (error) {
      console.error('Error deleting content:', error);
      return res.status(500).json({ error: 'Failed to delete content' });
    }
  }

  // Add question to content
  async addQuestionToContent(req, res) {
    try {
      const { id } = req.params;
      const { question } = req.body;
      const userId = req.user.id; // Assuming req.user is set from auth middleware
      
      // Check if content exists
      const content = await prisma.content.findUnique({
        where: { id }
      });
      
      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }
      
      // Check if user has permission to update this content
      if (content.facultyId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'You do not have permission to update this content' });
      }
      
      // Validate question format
      if (!question || typeof question !== 'object') {
        return res.status(400).json({ error: 'Question must be a valid object' });
      }
      
      // Add the new question to the existing questions array
      const updatedQuestions = [...content.questions, question];
      
      // Update the content
      const updatedContent = await prisma.content.update({
        where: { id },
        data: {
          questions: updatedQuestions
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'ADD_QUESTION_TO_CONTENT',
          metadata: {
            contentId: id,
            questionIndex: updatedQuestions.length - 1
          }
        }
      });
      
      return res.status(200).json(updatedContent);
    } catch (error) {
      console.error('Error adding question to content:', error);
      return res.status(500).json({ error: 'Failed to add question to content' });
    }
  }

  // Remove question from content
  async removeQuestionFromContent(req, res) {
    try {
      const { id } = req.params;
      const { questionIndex } = req.body;
      const userId = req.user.id; // Assuming req.user is set from auth middleware
      
      // Check if content exists
      const content = await prisma.content.findUnique({
        where: { id }
      });
      
      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }
      
      // Check if user has permission to update this content
      if (content.facultyId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'You do not have permission to update this content' });
      }
      
      // Check if questionIndex is valid
      if (questionIndex < 0 || questionIndex >= content.questions.length) {
        return res.status(400).json({ error: 'Invalid question index' });
      }
      
      // Remove the question from the questions array
      const updatedQuestions = content.questions.filter((_, index) => index !== questionIndex);
      
      // Update the content
      const updatedContent = await prisma.content.update({
        where: { id },
        data: {
          questions: updatedQuestions
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'REMOVE_QUESTION_FROM_CONTENT',
          metadata: {
            contentId: id,
            removedQuestionIndex: questionIndex
          }
        }
      });
      
      return res.status(200).json(updatedContent);
    } catch (error) {
      console.error('Error removing question from content:', error);
      return res.status(500).json({ error: 'Failed to remove question from content' });
    }
  }
}

module.exports = new ContentController();