// src/controllers/user.controller.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// Create new user
export const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
};

// Login user and issue JWT
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ accessToken: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to login.' });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;
    const data = { name, email };
    if (password) data.password = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({ where: { id }, data, select: { id: true, email: true, name: true } });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};