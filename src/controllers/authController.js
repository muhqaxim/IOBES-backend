const prisma = require("../config/db");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../utils/auth");

const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Basic input validation
    if (!email || !password || !name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Optional: Only ADMIN can create another ADMIN
    if (role === "ADMIN" && req.user?.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Only admins can create admin users" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "FACULTY",
      },
    });

    // Generate JWT token
    const token = generateToken(user);

    return res.status(200).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input check
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // At this point, role is already in user object, no need to pass from frontend
    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  register,
  login,
};
