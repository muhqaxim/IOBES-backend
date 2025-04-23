const prisma = require("../config/db");

const getAllCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        facultyAssignments: {
          include: {
            faculty: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        clos: true,
        contents: true,
      },
    });

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        facultyAssignments: {
          include: {
            faculty: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        clos: true,
      },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createCourse = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    const existingCourse = await prisma.course.findUnique({ where: { code } });
    if (existingCourse) {
      return res
        .status(400)
        .json({ message: "Course with this code already exists" });
    }

    const course = await prisma.course.create({
      data: {
        name,
        code,
        description,
      },
    });

    res.status(200).json({
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, facultyId } = req.body;

    const course = await prisma.course.update({
      where: { id },
      data: { name, code, description },
    });

    if (facultyId) {
      await prisma.facultyCourseAssignment.create({
        data: {
          faculty: { connect: { id: facultyId } },
          course: { connect: { id } },
        },
      });
    }

    res.status(200).json({
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.course.delete({ where: { id } });

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const assignFacultyToCourse = async (req, res) => {
  try {
    const { courseId, facultyId } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    const faculty = await prisma.user.findFirst({
      where: { id: facultyId, role: "FACULTY" },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    await prisma.facultyCourseAssignment.create({
      data: {
        course: { connect: { id: courseId } },
        faculty: { connect: { id: facultyId } },
      },
    });

    res
      .status(200)
      .json({ message: "Faculty assigned to course successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const removeFacultyFromCourse = async (req, res) => {
  try {
    const { courseId, facultyId } = req.body;

    await prisma.facultyCourseAssignment.delete({
      where: {
        facultyId_courseId: {
          facultyId,
          courseId,
        },
      },
    });

    res
      .status(200)
      .json({ message: "Faculty removed from course successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  assignFacultyToCourse,
  removeFacultyFromCourse,
};
