
// src/routes/user.routes.js
import { Router } from 'express';
import {
  createUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/user.controller.js';

const router = Router();

// Auth routes
router.post('/register', createUser);
router.post('/login', loginUser);

// CRUD routes for User
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
