const prisma = require("../config/db");

// Placeholder for AI service
const generateContentWithAI = async (type, courseId) => {
  const templates = {
    QUIZ: {
      questions: [
        {
          question: "Sample question 1?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option A",
        },
        {
          question: "Sample question 2?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option C",
        },
      ],
    },
    ASSIGNMENT: {
      questions: [
        {
          question: "Assignment task 1",
          points: 50,
        },
        {
          question: "Assignment task 2",
          points: 50,
        },
      ],
    },
    EXAM: {
      questions: [
        {
          question: "Exam question 1?",
          points: 20,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option B",
        },
        {
          question: "Exam question 2?",
          points: 20,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option D",
        },
        {
          question: "Exam essay question",
          points: 60,
          type: "essay",
        },
      ],
    },
  };

  return templates[type];
};

const getAllContentByFaculty = async (req, res) => {
  try {
    const facultyId = req.user.id;

    const contents = await prisma.content.findMany({
      where: { facultyId },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    res.status(200).json(contents);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.id;

    const content = await prisma.content.findFirst({
      where: {
        id,
        facultyId,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!content) {
      return res
        .status(404)
        .json({ message: "Content not found or unauthorized" });
    }

    res.status(200).json(content);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createContent = async (req, res) => {
  try {
    const { title, type, courseId, autoGenerate } = req.body;
    const facultyId = req.user.id;

    // Check if course exists and faculty is assigned to it
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        faculty: {
          some: {
            id: facultyId,
          },
        },
      },
    });

    if (!course) {
      return res
        .status(404)
        .json({ message: "Course not found or not assigned to you" });
    }

    // Generate content with AI if requested
    let questions = req.body.questions;
    if (autoGenerate) {
      questions = await generateContentWithAI(type, courseId);
    }

    // Create content
    const content = await prisma.content.create({
      data: {
        title,
        type,
        questions,
        courseId,
        facultyId,
      },
    });

    res.status(200).json({
      message: "Content created successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, questions } = req.body;
    const facultyId = req.user.id;

    // Check if content exists and belongs to the faculty
    const existingContent = await prisma.content.findFirst({
      where: {
        id,
        facultyId,
      },
    });

    if (!existingContent) {
      return res
        .status(404)
        .json({ message: "Content not found or unauthorized" });
    }

    // Update content
    const content = await prisma.content.update({
      where: { id },
      data: {
        title,
        questions,
      },
    });

    res.status(200).json({
      message: "Content updated successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.id;

    // Check if content exists and belongs to the faculty
    const existingContent = await prisma.content.findFirst({
      where: {
        id,
        facultyId,
      },
    });

    if (!existingContent) {
      return res
        .status(404)
        .json({ message: "Content not found or unauthorized" });
    }

    // Delete content
    await prisma.content.delete({ where: { id } });

    res.status(200).json({ message: "Content deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const generateContentAI = async (req, res) => {
  try {
    const { type, courseId } = req.body;
    const facultyId = req.user.id;

    // Check if course exists and faculty is assigned to it
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        faculty: {
          some: {
            id: facultyId,
          },
        },
      },
    });

    if (!course) {
      return res
        .status(404)
        .json({ message: "Course not found or not assigned to you" });
    }

    // Generate content with AI
    const generatedContent = await generateContentWithAI(type, courseId);

    res.status(200).json({
      message: "Content generated successfully",
      content: generatedContent,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllContentByFaculty,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  generateContentAI,
};
