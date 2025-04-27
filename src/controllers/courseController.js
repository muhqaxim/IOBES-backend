const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CourseController {
  // Get all courses with optional filtering
  async getAllCourses(req, res) {
    try {
      const { departmentId, code, name } = req.query;
      
      // Build filter object based on query parameters
      const filter = {};
      if (departmentId) filter.departmentId = departmentId;
      if (code) filter.code = { contains: code };
      if (name) filter.name = { contains: name };
      
      const courses = await prisma.course.findMany({
        where: filter,
        include: {
          department: true,
          clos: true,
          facultyAssignments: {
            include: {
              faculty: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });
      
      return res.status(200).json(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }
  }

  // Get single course by ID
  async getCourseById(req, res) {
    try {
      const { id } = req.params;
      
      const course = await prisma.course.findUnique({
        where: { id },
        include: {
          department: true,
          clos: true,
          facultyAssignments: {
            include: {
              faculty: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          contents: {
            include: {
              faculty: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      return res.status(200).json(course);
    } catch (error) {
      console.error('Error fetching course:', error);
      return res.status(500).json({ error: 'Failed to fetch course' });
    }
  }

  // Create a new course
  async createCourse(req, res) {
    try {
      const { name, code, description, departmentId } = req.body;
      
      // Check if course code already exists
      const existingCourse = await prisma.course.findUnique({
        where: { code }
      });
      
      if (existingCourse) {
        return res.status(409).json({ error: 'Course with this code already exists' });
      }
      
      // Check if department exists
      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      });
      
      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }
      
      const newCourse = await prisma.course.create({
        data: {
          name,
          code,
          description,
          departmentId
        },
        include: {
          department: true
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'CREATE_COURSE',
          metadata: {
            courseId: newCourse.id,
            courseName: newCourse.name,
            courseCode: newCourse.code
          }
        }
      });
      
      return res.status(201).json(newCourse);
    } catch (error) {
      console.error('Error creating course:', error);
      return res.status(500).json({ error: 'Failed to create course' });
    }
  }

  // Update a course
  async updateCourse(req, res) {
    try {
      const { id } = req.params;
      const { name, code, description, departmentId } = req.body;
      
      // Check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id }
      });
      
      if (!existingCourse) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // If updating code, check if the new code already exists
      if (code && code !== existingCourse.code) {
        const courseWithCode = await prisma.course.findUnique({
          where: { code }
        });
        
        if (courseWithCode) {
          return res.status(409).json({ error: 'Course with this code already exists' });
        }
      }
      
      // If updating department, check if the new department exists
      if (departmentId && departmentId !== existingCourse.departmentId) {
        const department = await prisma.department.findUnique({
          where: { id: departmentId }
        });
        
        if (!department) {
          return res.status(404).json({ error: 'Department not found' });
        }
      }
      
      // Prepare update data
      const updateData = {};
      if (name) updateData.name = name;
      if (code) updateData.code = code;
      if (description !== undefined) updateData.description = description;
      if (departmentId) updateData.departmentId = departmentId;
      
      const updatedCourse = await prisma.course.update({
        where: { id },
        data: updateData,
        include: {
          department: true
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'UPDATE_COURSE',
          metadata: {
            courseId: id,
            updatedFields: Object.keys(updateData)
          }
        }
      });
      
      return res.status(200).json(updatedCourse);
    } catch (error) {
      console.error('Error updating course:', error);
      return res.status(500).json({ error: 'Failed to update course' });
    }
  }

  // Delete a course
  async deleteCourse(req, res) {
    try {
      const { id } = req.params;
      
      // Check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id }
      });
      
      if (!existingCourse) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // Delete the course
      await prisma.course.delete({
        where: { id }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'DELETE_COURSE',
          metadata: {
            deletedCourseId: id,
            deletedCourseName: existingCourse.name,
            deletedCourseCode: existingCourse.code
          }
        }
      });
      
      return res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
      console.error('Error deleting course:', error);
      return res.status(500).json({ error: 'Failed to delete course' });
    }
  }

  // Get course contents
  async getCourseContents(req, res) {
    try {
      const { id } = req.params;
      const { type } = req.query;
      
      const filter = { courseId: id };
      if (type) filter.type = type;
      
      const contents = await prisma.content.findMany({
        where: filter,
        include: {
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
      console.error('Error fetching course contents:', error);
      return res.status(500).json({ error: 'Failed to fetch course contents' });
    }
  }

  // Get course CLOs
  async getCourseCLOs(req, res) {
    try {
      const { id } = req.params;
      
      const clos = await prisma.cLO.findMany({
        where: { courseId: id },
        orderBy: { number: 'asc' }
      });
      
      return res.status(200).json(clos);
    } catch (error) {
      console.error('Error fetching course CLOs:', error);
      return res.status(500).json({ error: 'Failed to fetch course CLOs' });
    }
  }

  // Assign faculty to course
  async assignFacultyToCourse(req, res) {
    try {
      const { courseId, facultyId } = req.body;
      
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // Check if faculty exists and is a faculty member
      const faculty = await prisma.user.findUnique({
        where: { id: facultyId }
      });
      
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty not found' });
      }
      
      if (faculty.role !== 'FACULTY') {
        return res.status(400).json({ error: 'User is not a faculty member' });
      }
      
      // Check if assignment already exists
      const existingAssignment = await prisma.facultyCourseAssignment.findFirst({
        where: {
          facultyId,
          courseId
        }
      });
      
      if (existingAssignment) {
        return res.status(409).json({ error: 'Faculty is already assigned to this course' });
      }
      
      const assignment = await prisma.facultyCourseAssignment.create({
        data: {
          facultyId,
          courseId
        },
        include: {
          faculty: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          course: true
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'ASSIGN_FACULTY_TO_COURSE',
          metadata: {
            assignmentId: assignment.id,
            facultyId,
            courseId
          }
        }
      });
      
      return res.status(201).json(assignment);
    } catch (error) {
      console.error('Error assigning faculty to course:', error);
      return res.status(500).json({ error: 'Failed to assign faculty to course' });
    }
  }

  // Remove faculty from course
  async removeFacultyFromCourse(req, res) {
    try {
      const { assignmentId } = req.params;
      
      // Check if assignment exists
      const assignment = await prisma.facultyCourseAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          faculty: {
            select: {
              id: true,
              name: true
            }
          },
          course: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });
      
      if (!assignment) {
        return res.status(404).json({ error: 'Faculty course assignment not found' });
      }
      
      // Delete the assignment
      await prisma.facultyCourseAssignment.delete({
        where: { id: assignmentId }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'REMOVE_FACULTY_FROM_COURSE',
          metadata: {
            deletedAssignmentId: assignmentId,
            facultyId: assignment.faculty.id,
            facultyName: assignment.faculty.name,
            courseId: assignment.course.id,
            courseName: assignment.course.name,
            courseCode: assignment.course.code
          }
        }
      });
      
      return res.status(200).json({ message: 'Faculty removed from course successfully' });
    } catch (error) {
      console.error('Error removing faculty from course:', error);
      return res.status(500).json({ error: 'Failed to remove faculty from course' });
    }
  }
}

module.exports = new CourseController();