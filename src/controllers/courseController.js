const prisma = require("../config/db");

const getAllCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        facultyAssignments: {
          include: {
            faculty: {
              select: { id: true, name: true, email: true },
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
      where: { id: parseInt(id) },
      include: {
        facultyAssignments: {
          include: {
            faculty: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        clos: true,
      },
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createCourse = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      creditHours = 3,
      facultyId,
      clos = [],
    } = req.body;

    if (!name || !code) {
      return res
        .status(400)
        .json({ message: "Course name and code are required" });
    }

    const existingCourse = await prisma.course.findUnique({ where: { code } });
    if (existingCourse) {
      return res
        .status(400)
        .json({ message: "Course with this code already exists" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          name,
          code,
          description,
          creditHours: parseInt(creditHours),
        },
      });

      if (clos.length > 0) {
        await tx.cLO.createMany({
          data: clos.map((clo) => ({
            description: clo.description,
            number: clo.number,
            courseId: course.id,
          })),
        });
      }

      if (facultyId) {
        await tx.facultyCourseAssignment.create({
          data: {
            facultyId,
            courseId: course.id,
          },
        });
      }

      return await tx.course.findUnique({
        where: { id: course.id },
        include: {
          clos: true,
          facultyAssignments: {
            include: {
              faculty: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
    });

    res.status(201).json({
      message: "Course created successfully",
      course: result,
    });
  } catch (error) {
    console.error("Course creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;  // The ID from params will be passed as a string
    const { name, code, description, creditHours, facultyId } = req.body;

    // Ensure that the course ID is treated as a string
    const course = await prisma.course.findUnique({
      where: { id: String(id) },  // Convert the ID to string
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Check for duplicate course code
    if (code !== course.code) {
      const duplicate = await prisma.course.findUnique({ where: { code } });
      if (duplicate) return res.status(400).json({ message: "Course code already exists" });
    }

    // Update the course details
    const updatedCourse = await prisma.course.update({
      where: { id: String(id) },  // Ensure the ID is treated as a string
      data: {
        name,
        code,
        description,
        ...(creditHours && { creditHours: parseInt(creditHours) }),  // If creditHours is provided, convert it to an integer
      },
    });

    // If facultyId is provided, assign faculty to the course
    if (facultyId) {
      const assignment = await prisma.facultyCourseAssignment.findUnique({
        where: {
          facultyId_courseId: {
            facultyId: String(facultyId),  // Ensure the facultyId is treated as a string
            courseId: String(id),  // Ensure the courseId is treated as a string
          },
        },
      });

      if (!assignment) {
        await prisma.facultyCourseAssignment.create({
          data: {
            facultyId: String(facultyId),  // Ensure facultyId is a string
            courseId: String(id),  // Ensure courseId is a string
          },
        });
      }
    }

    // Respond with success message
    res.status(200).json({
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    let { id } = req.params; // `id` should already be a string

    // Ensure the ID is a string
    id = String(id);

    // Find the course by string ID (no need to parseInt here)
    const course = await prisma.course.findUnique({ where: { id } });

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Proceed with deleting related content and the course
    await prisma.$transaction([
      prisma.cLO.deleteMany({ where: { courseId: id } }),
      prisma.facultyCourseAssignment.deleteMany({ where: { courseId: id } }),
      prisma.course.delete({ where: { id } }),
    ]);

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const assignFacultyToCourse = async (req, res) => {
  try {
    const { courseId, facultyId } = req.body;

    // Fetch the course by ID
    const course = await prisma.course.findUnique({
      where: { id: String(courseId) }, // Ensure the course ID is a string
    });

    // Fetch the faculty by ID
    const faculty = await prisma.user.findFirst({
      where: { id: facultyId, role: "FACULTY" },
    });

    // If course or faculty does not exist, return an error
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    // Check if the faculty is already assigned to the course
    const existingAssignment = await prisma.facultyCourseAssignment.findUnique({
      where: {
        facultyId_courseId: {
          facultyId,
          courseId: String(courseId),
        },
      },
    });

    // If faculty is already assigned to the course, return an error
    if (existingAssignment) {
      return res.status(400).json({ message: "Faculty is already assigned to this course" });
    }

    // Proceed to assign the faculty to the course
    await prisma.facultyCourseAssignment.create({
      data: {
        facultyId: String(facultyId), // Ensure faculty ID is a string
        courseId: String(courseId), // Ensure course ID is a string
      },
    });

    // Return success message
    res.status(200).json({ message: "Faculty assigned successfully to the course" });
  } catch (error) {
    console.error("Error assigning faculty to course:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const removeFacultyFromCourse = async (req, res) => {
  try {
    const { courseId, facultyId } = req.body;

    const assignment = await prisma.facultyCourseAssignment.findUnique({
      where: {
        facultyId_courseId: {
          facultyId,
          courseId,
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Faculty not assigned to course" });
    }

    await prisma.facultyCourseAssignment.delete({
      where: {
        facultyId_courseId: {
          facultyId,
          courseId,
        },
      },
    });

    res.status(200).json({ message: "Faculty removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getCourseByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;

    if (!facultyId) {
      return res.status(400).json({ message: "Faculty ID is required" });
    }

    const assignments = await prisma.facultyCourseAssignment.findMany({
      where: {
        facultyId: facultyId,
      },
      include: {
        course: {
          include: {
            clos: true,
            contents: true,
          },
        },
      },
    });

    const courses = assignments.map((a) => a.course);

    res.status(200).json({ courses });
  } catch (error) {
    console.error("Error fetching courses by faculty:", error);
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
  getCourseByFaculty
};