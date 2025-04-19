const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }
  next();
};

const isFaculty = (req, res, next) => {
  if (req.user.role !== 'FACULTY') {
    return res.status(403).json({ message: 'Access denied. Faculty rights required.' });
  }
  next();
};

module.exports = {
  authenticate,
  isAdmin,
  isFaculty
};
