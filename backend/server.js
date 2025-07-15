require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./src/config/db');

const companyRoutes = require('./src/routes/companyRoutes');
const resumeRoutes = require('./src/routes/resumeRoutes');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');

const { errorHandler } = require('./src/middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/companies', companyRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});
app.use(errorHandler);
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
