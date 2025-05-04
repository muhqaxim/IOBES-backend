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
    const { id } = req.params;
    const { name, code, description, creditHours, facultyId } = req.body;

    const course = await prisma.course.findUnique({ where: { id: parseInt(id) } });
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (code !== course.code) {
      const duplicate = await prisma.course.findUnique({ where: { code } });
      if (duplicate) return res.status(400).json({ message: "Course code already exists" });
    }

    const updatedCourse = await prisma.course.update({
      where: { id: parseInt(id) },
      data: {
        name,
        code,
        description,
        ...(creditHours && { creditHours: parseInt(creditHours) }),
      },
    });

    if (facultyId) {
      const assignment = await prisma.facultyCourseAssignment.findUnique({
        where: {
          facultyId_courseId: {
            facultyId,
            courseId: parseInt(id),
          },
        },
      });

      if (!assignment) {
        await prisma.facultyCourseAssignment.create({
          data: {
            facultyId,
            courseId: parseInt(id),
          },
        });
      }
    }

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
    const { id } = req.params;

    const course = await prisma.course.findUnique({ where: { id: parseInt(id) } });
    if (!course) return res.status(404).json({ message: "Course not found" });

    await prisma.$transaction([
      prisma.cLO.deleteMany({ where: { courseId: parseInt(id) } }),
      prisma.facultyCourseAssignment.deleteMany({ where: { courseId: parseInt(id) } }),
      prisma.course.delete({ where: { id: parseInt(id) } }),
    ]);

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

    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const existing = await prisma.facultyCourseAssignment.findUnique({
      where: {
        facultyId_courseId: {
          facultyId,
          courseId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: "Faculty is already assigned" });
    }

    await prisma.facultyCourseAssignment.create({
      data: {
        facultyId,
        courseId,
      },
    });

    res.status(200).json({ message: "Faculty assigned successfully" });
  } catch (error) {
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
// const prisma = require("../config/db");

// const getAllCourses = async (req, res) => {
//   try {
//     const courses = await prisma.course.findMany({
//       include: {
//         facultyAssignments: {
//           include: {
//             faculty: {
//               select: {
//                 id: true,
//                 name: true,
//                 email: true,
//               },
//             },
//           },
//         },
//         clos: true,
//         contents: true,
//       },
//     });

//     res.status(200).json(courses);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// const getCourseById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const course = await prisma.course.findUnique({
//       where: { id },
//       include: {
//         facultyAssignments: {
//           include: {
//             faculty: {
//               select: {
//                 id: true,
//                 name: true,
//                 email: true,
//               },
//             },
//           },
//         },
//         clos: true,
//       },
//     });

//     if (!course) {
//       return res.status(404).json({ message: "Course not found" });
//     }

//     res.status(200).json(course);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// const createCourse = async (req, res) => {
//   try {
//     const { name, code, description } = req.body;

//     const existingCourse = await prisma.course.findUnique({ where: { code } });
//     if (existingCourse) {
//       return res
//         .status(400)
//         .json({ message: "Course with this code already exists" });
//     }

//     const course = await prisma.course.create({
//       data: {
//         name,
//         code,
//         description,
//       },
//     });

//     res.status(200).json({
//       message: "Course created successfully",
//       course,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// const updateCourse = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, code, description, facultyId } = req.body;

//     const course = await prisma.course.update({
//       where: { id },
//       data: { name, code, description },
//     });

//     if (facultyId) {
//       await prisma.facultyCourseAssignment.create({
//         data: {
//           faculty: { connect: { id: facultyId } },
//           course: { connect: { id } },
//         },
//       });
//     }

//     res.status(200).json({
//       message: "Course updated successfully",
//       course,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

// const deleteCourse = async (req, res) => {
//   try {
//     const { id } = req.params;

//     await prisma.course.delete({ where: { id } });

//     res.status(200).json({ message: "Course deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// const assignFacultyToCourse = async (req, res) => {
//   try {
//     const { courseId, facultyId } = req.body;

//     const course = await prisma.course.findUnique({ where: { id: courseId } });
//     const faculty = await prisma.user.findFirst({
//       where: { id: facultyId, role: "FACULTY" },
//     });

//     if (!course) {
//       return res.status(404).json({ message: "Course not found" });
//     }

//     if (!faculty) {
//       return res.status(404).json({ message: "Faculty not found" });
//     }

//     await prisma.facultyCourseAssignment.create({
//       data: {
//         course: { connect: { id: courseId } },
//         faculty: { connect: { id: facultyId } },
//       },
//     });

//     res
//       .status(200)
//       .json({ message: "Faculty assigned to course successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// const removeFacultyFromCourse = async (req, res) => {
//   try {
//     const { courseId, facultyId } = req.body;

//     await prisma.facultyCourseAssignment.delete({
//       where: {
//         facultyId_courseId: {
//           facultyId,
//           courseId,
//         },
//       },
//     });

//     res
//       .status(200)
//       .json({ message: "Faculty removed from course successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// module.exports = {
//   getAllCourses,
//   getCourseById,
//   createCourse,
//   updateCourse,
//   deleteCourse,
//   assignFacultyToCourse,
//   removeFacultyFromCourse,
// };
