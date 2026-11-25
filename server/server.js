require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { seedDemoIfEmpty } = require('./utils/seedData');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const goalRoutes = require('./routes/goalRoutes');
const metricRoutes = require('./routes/metricRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'FITNEX API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  if (process.env.AUTO_SEED_DEMO !== 'false') {
    await seedDemoIfEmpty();
  }
  return app.listen(PORT, () => {
    console.log(`FITNEX backend running on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start FITNEX server:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
