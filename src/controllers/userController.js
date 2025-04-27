const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

class UserController {
  // Get all users with optional filtering
  async getAllUsers(req, res) {
    try {
      const { role } = req.query;
      const filter = role ? { role } : {};
      
      const users = await prisma.user.findMany({
        where: filter,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          // Exclude password from the response
        }
      });
      
      return res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // Get single user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          // Include related data if needed
          contents: true,
          facultyCourses: {
            include: {
              course: true
            }
          }
        }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  // Create a new user
  async createUser(req, res) {
    try {
      const { email, password, name, role } = req.body;
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role || 'FACULTY'
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'CREATE_USER',
          metadata: {
            createdUserId: newUser.id,
            role: newUser.role
          }
        }
      });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;
      
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }

  // Update a user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, name, role, password } = req.body;
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Prepare update data
      const updateData = {};
      if (email) updateData.email = email;
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'UPDATE_USER',
          metadata: {
            updatedUserId: id,
            fields: Object.keys(updateData)
          }
        }
      });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  // Delete a user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Delete the user
      await prisma.user.delete({
        where: { id }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'DELETE_USER',
          metadata: {
            deletedUserId: id,
            deletedUserEmail: existingUser.email
          }
        }
      });
      
      return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  // Get faculty courses
  async getUserCourses(req, res) {
    try {
      const { id } = req.params;
      
      const facultyCourses = await prisma.facultyCourseAssignment.findMany({
        where: { facultyId: id },
        include: {
          course: {
            include: {
              clos: true
            }
          }
        }
      });
      
      return res.status(200).json(facultyCourses);
    } catch (error) {
      console.error('Error fetching user courses:', error);
      return res.status(500).json({ error: 'Failed to fetch user courses' });
    }
  }

  // Get user activity logs
  async getUserActivityLogs(req, res) {
    try {
      const { id } = req.params;
      const { limit = 10, page = 1 } = req.query;
      
      const skip = (page - 1) * limit;
      
      const logs = await prisma.activityLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: skip
      });
      
      const totalLogs = await prisma.activityLog.count({
        where: { userId: id }
      });
      
      return res.status(200).json({
        logs,
        pagination: {
          total: totalLogs,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(totalLogs / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      return res.status(500).json({ error: 'Failed to fetch user activity logs' });
    }
  }
}

module.exports = new UserController();