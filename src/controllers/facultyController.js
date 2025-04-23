const prisma = require("../config/db");
const { hashPassword } = require("../utils/auth");

const getAllFaculty = async (req, res) => {
  try {
    const faculty = await prisma.user.findMany({
      where: {
        role: "FACULTY",
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        facultyCourses: {
          select: {
            course: true,
          },
        },
      },
    });

    res.status(200).json(faculty);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        courses: true,
      },
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.status(200).json(faculty);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createFaculty = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const faculty = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "FACULTY",
      },
    });

    res.status(200).json({
      message: "Faculty created successfully",
      faculty: {
        id: faculty.id,
        email: faculty.email,
        name: faculty.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, password } = req.body;

    const updateData = { name, email };

    // Only update password if provided
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const faculty = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    res.status(200).json({
      message: "Faculty updated successfully",
      faculty,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({ where: { id } });

    res.status(200).json({ message: "Faculty deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllFaculty,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
};
