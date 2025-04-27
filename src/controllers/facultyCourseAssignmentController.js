const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FacultyCourseAssignmentController {
  // Get all faculty-course assignments with optional filtering
  async getAllAssignments(req, res) {
    try {
      const { facultyId, courseId } = req.query;
      
      // Build filter object based on query parameters
      const filter = {};
      if (facultyId) filter.facultyId = facultyId;
      if (courseId) filter.courseId = courseId;
      
      const assignments = await prisma.facultyCourseAssignment.findMany({
        where: filter,
        include: {
          faculty: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          course: {
            include: {
              department: true
            }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });
      
      return res.status(200).json(assignments);
    } catch (error) {
      console.error('Error fetching faculty-course assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch faculty-course assignments' });
    }
  }

  // Get single assignment by ID
  async getAssignmentById(req, res) {
    try {
      const { id } = req.params;
      
      const assignment = await prisma.facultyCourseAssignment.findUnique({
        where: { id },
        include: {
          faculty: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          course: {
            include: {
              department: true,
              clos: true
            }
          }
        }
      });
      
      if (!assignment) {
        return res.status(404).json({ error: 'Faculty-course assignment not found' });
      }
      
      return res.status(200).json(assignment);
    } catch (error) {
      console.error('Error fetching faculty-course assignment:', error);
      return res.status(500).json({ error: 'Failed to fetch faculty-course assignment' });
    }
  }

  // Create a new faculty-course assignment
  async createAssignment(req, res) {
    try {
      const { facultyId, courseId } = req.body;
      
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
      
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
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
      
      // Create the assignment
      const newAssignment = await prisma.facultyCourseAssignment.create({
        data: {
          facultyId,
          courseId
        },
        include: {
          faculty: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          course: {
            include: {
              department: true
            }
          }
        }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'CREATE_FACULTY_COURSE_ASSIGNMENT',
          metadata: {
            assignmentId: newAssignment.id,
            facultyId,
            facultyName: faculty.name,
            courseId,
            courseName: course.name,
            courseCode: course.code
          }
        }
      });
      
      return res.status(201).json(newAssignment);
    } catch (error) {
      console.error('Error creating faculty-course assignment:', error);
      return res.status(500).json({ error: 'Failed to create faculty-course assignment' });
    }
  }

  // Delete a faculty-course assignment
  async deleteAssignment(req, res) {
    try {
      const { id } = req.params;
      
      // Check if assignment exists
      const assignment = await prisma.facultyCourseAssignment.findUnique({
        where: { id },
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
        return res.status(404).json({ error: 'Faculty-course assignment not found' });
      }
      
      // Delete the assignment
      await prisma.facultyCourseAssignment.delete({
        where: { id }
      });
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'DELETE_FACULTY_COURSE_ASSIGNMENT',
          metadata: {
            deletedAssignmentId: id,
            facultyId: assignment.faculty.id,
            facultyName: assignment.faculty.name,
            courseId: assignment.course.id,
            courseName: assignment.course.name,
            courseCode: assignment.course.code
          }
        }
      });
      
      return res.status(200).json({ message: 'Faculty-course assignment deleted successfully' });
    } catch (error) {
      console.error('Error deleting faculty-course assignment:', error);
      return res.status(500).json({ error: 'Failed to delete faculty-course assignment' });
    }
  }

  // Get all courses assigned to a faculty
  async getFacultyCourses(req, res) {
    try {
      const { facultyId } = req.params;
      
      // Check if faculty exists
      const faculty = await prisma.user.findUnique({
        where: { id: facultyId }
      });
      
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty not found' });
      }
      
      const assignments = await prisma.facultyCourseAssignment.findMany({
        where: { facultyId },
        include: {
          course: {
            include: {
              department: true,
              clos: true
            }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });
      
      // Extract just the course information with assignment date
      const courses = assignments.map(assignment => ({
        ...assignment.course,
        assignedAt: assignment.assignedAt,
        assignmentId: assignment.id
      }));
      
      return res.status(200).json(courses);
    } catch (error) {
      console.error('Error fetching faculty courses:', error);
      return res.status(500).json({ error: 'Failed to fetch faculty courses' });
    }
  }

  // Get all faculty assigned to a course
  async getCourseFaculty(req, res) {
    try {
      const { courseId } = req.params;
      
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      const assignments = await prisma.facultyCourseAssignment.findMany({
        where: { courseId },
        include: {
          faculty: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true
            }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });
      
      // Extract just the faculty information with assignment date
      const faculty = assignments.map(assignment => ({
        ...assignment.faculty,
        assignedAt: assignment.assignedAt,
        assignmentId: assignment.id
      }));
      
      return res.status(200).json(faculty);
    } catch (error) {
      console.error('Error fetching course faculty:', error);
      return res.status(500).json({ error: 'Failed to fetch course faculty' });
    }
  }

  // Bulk assign multiple courses to a faculty
  async bulkAssignCoursesToFaculty(req, res) {
    try {
      const { facultyId, courseIds } = req.body;
      
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
      
      // Check if all courses exist
      const courses = await prisma.course.findMany({
        where: { id: { in: courseIds } }
      });
      
      if (courses.length !== courseIds.length) {
        return res.status(404).json({ error: 'One or more courses not found' });
      }
      
      // Check which assignments already exist
      const existingAssignments = await prisma.facultyCourseAssignment.findMany({
        where: {
          facultyId,
          courseId: { in: courseIds }
        }
      });
      
      const existingCourseIds = existingAssignments.map(a => a.courseId);
      const newCourseIds = courseIds.filter(id => !existingCourseIds.includes(id));
      
      // Create new assignments
      const createdAssignments = await Promise.all(
        newCourseIds.map(courseId => 
          prisma.facultyCourseAssignment.create({
            data: {
              facultyId,
              courseId
            },
            include: {
              course: {
                select: {
                  name: true,
                  code: true
                }
              }
            }
          })
        )
      );
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'BULK_ASSIGN_COURSES_TO_FACULTY',
          metadata: {
            facultyId,
            facultyName: faculty.name,
            assignedCourseCount: createdAssignments.length,
            skippedCourseCount: existingCourseIds.length,
            assignedCourseIds: newCourseIds
          }
        }
      });
      
      return res.status(200).json({
        message: `Successfully assigned ${createdAssignments.length} courses to faculty, ${existingCourseIds.length} were already assigned`,
        createdAssignments,
        alreadyAssignedCourseIds: existingCourseIds
      });
    } catch (error) {
      console.error('Error bulk assigning courses to faculty:', error);
      return res.status(500).json({ error: 'Failed to bulk assign courses to faculty' });
    }
  }

  // Bulk assign multiple faculty to a course
  async bulkAssignFacultyToCourse(req, res) {
    try {
      const { courseId, facultyIds } = req.body;
      
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // Check if all faculty exist and are faculty members
      const faculty = await prisma.user.findMany({
        where: { 
          id: { in: facultyIds },
          role: 'FACULTY'
        }
      });
      
      if (faculty.length !== facultyIds.length) {
        return res.status(404).json({ error: 'One or more faculty not found or are not faculty members' });
      }
      
      // Check which assignments already exist
      const existingAssignments = await prisma.facultyCourseAssignment.findMany({
        where: {
          courseId,
          facultyId: { in: facultyIds }
        }
      });
      
      const existingFacultyIds = existingAssignments.map(a => a.facultyId);
      const newFacultyIds = facultyIds.filter(id => !existingFacultyIds.includes(id));
      
      // Create new assignments
      const createdAssignments = await Promise.all(
        newFacultyIds.map(facultyId => 
          prisma.facultyCourseAssignment.create({
            data: {
              facultyId,
              courseId
            },
            include: {
              faculty: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          })
        )
      );
      
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, // Assuming req.user is set from auth middleware
          action: 'BULK_ASSIGN_FACULTY_TO_COURSE',
          metadata: {
            courseId,
            courseName: course.name,
            courseCode: course.code,
            assignedFacultyCount: createdAssignments.length,
            skippedFacultyCount: existingFacultyIds.length,
            assignedFacultyIds: newFacultyIds
          }
        }
      });
      
      return res.status(200).json({
        message: `Successfully assigned ${createdAssignments.length} faculty to the course, ${existingFacultyIds.length} were already assigned`,
        createdAssignments,
        alreadyAssignedFacultyIds: existingFacultyIds
      });
    } catch (error) {
      console.error('Error bulk assigning faculty to course:', error);
      return res.status(500).json({ error: 'Failed to bulk assign faculty to course' });
    }
  }
}

module.exports = new FacultyCourseAssignmentController();