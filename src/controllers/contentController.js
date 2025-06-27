
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create Content (Assignment, Quiz, Exam)
exports.createContent = async (req, res) => {
  try {
    const { title, type, questions, courseId, cloIds, facultyId } = req.body;

    if (!["QUIZ", "ASSIGNMENT", "EXAM"].includes(type)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    if (!Array.isArray(cloIds) || cloIds.some((id) => typeof id !== "string")) {
      return res.status(400).json({ message: "Invalid cloIds array" });
    }

    const content = await prisma.content.create({
      data: {
        title,
        type,
        questions,
        courseId,
        facultyId,
        cloIds,
      },
    });

    res.status(201).json(content);
  } catch (error) {
    console.error("Create Content Error:", error);
    res.status(500).json({ message: "Failed to create content", error });
  }
};


// Get All Content by Course ID and Faculty ID
exports.getContentByCourseAndFaculty = async (req, res) => {
  const { courseId, facultyId } = req.params;
  try {
    const contents = await prisma.content.findMany({
      where: {
        courseId,
        facultyId,
      },
      include: {
        course: true,
      },
    });
    res.json(contents);
  } catch (error) {
    console.error('Fetch Content Error:', error);
    res.status(500).json({ message: 'Failed to fetch contents' });
  }
};

// Get All Content by Faculty ID (no course filter)
// Get All Content by Faculty ID (no course filter)
exports.getContentByFaculty = async (req, res) => {
  const { facultyId } = req.params;
  try {
    const contents = await prisma.content.findMany({
      where: {
        facultyId, // Filter by the facultyId
      },
      include: {
        course: true, // Ensure related course data is included
      },
    });
    res.json(contents); // Send the content
  } catch (error) {
    console.error("Fetch Faculty Content Error:", error);
    res.status(500).json({ message: "Failed to fetch faculty content" });
  }
};

// Get Single Content by ID
exports.getContentById = async (req, res) => {
  const { id } = req.params;
  try {
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        course: true,
      },
    });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json(content);
  } catch (error) {
    console.error('Fetch Single Content Error:', error);
    res.status(500).json({ message: 'Failed to fetch content' });
  }
};


// Delete Content by ID
exports.deleteContent = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the content exists
    const content = await prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Delete the content
    await prisma.content.delete({
      where: { id },
    });

    res.status(200).json({ message: "Content deleted successfully" });
  } catch (error) {
    console.error('Delete Content Error:', error);
    res.status(500).json({ message: 'Failed to delete content', error });
  }
};
