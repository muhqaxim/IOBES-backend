const prisma = require("../config/db");

const getCLOsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId)
      return res.status(400).json({ message: "Course ID is required" });

    const clos = await prisma.cLO.findMany({
      where: { courseId },
      orderBy: { number: "asc" },
    });

    return res.status(200).json(clos);
  } catch (error) {
    console.error("getCLOsByCourse Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createCLO = async (req, res) => {
  try {
    const { description, number, courseId } = req.body;

    if (!description || number == null || !courseId) {
      return res
        .status(400)
        .json({ message: "Description, number, and courseId are required" });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const clo = await prisma.cLO.create({
      data: { description, number, courseId },
    });

    return res.status(200).json({ message: "CLO created successfully", clo });
  } catch (error) {
    console.error("createCLO Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateCLO = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, number } = req.body;

    const existingCLO = await prisma.cLO.findUnique({ where: { id } });
    if (!existingCLO) {
      return res.status(404).json({ message: "CLO not found" });
    }

    const clo = await prisma.cLO.update({
      where: { id },
      data: { description, number },
    });

    return res.status(200).json({ message: "CLO updated successfully", clo });
  } catch (error) {
    console.error("updateCLO Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteCLO = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCLO = await prisma.cLO.findUnique({ where: { id } });
    if (!existingCLO) {
      return res.status(404).json({ message: "CLO not found" });
    }

    await prisma.cLO.delete({ where: { id } });

    return res.status(200).json({ message: "CLO deleted successfully" });
  } catch (error) {
    console.error("deleteCLO Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getCLOsByCourse,
  createCLO,
  updateCLO,
  deleteCLO,
};
