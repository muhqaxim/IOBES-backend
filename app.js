require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const facultyRoutes = require('./src/routes/facultyRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Education Management System API is running');
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});