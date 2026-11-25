const express = require('express');
const { body } = require('express-validator');
const Workout = require('../models/Workout');
const NutritionLog = require('../models/NutritionLog');
const DailyActivity = require('../models/DailyActivity');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/errorMiddleware');
const { toDateKey, getPastDateKeys } = require('../utils/dateUtils');
const { computeUserStreaks } = require('../utils/streakUtils');
const { recommendWorkouts, buildAiInsights, answerAiPrompt } = require('../utils/aiEngine');

const router = express.Router();

const gatherContext = async (user) => {
  const todayKey = toDateKey();
  const weekKeys = getPastDateKeys(7);

  const [recentWorkouts, todayNutrition, todayActivity, goals, streakInfo] = await Promise.all([
    Workout.find({ user: user._id, dateKey: { $gte: weekKeys[0] } }).lean(),
    NutritionLog.find({ user: user._id, dateKey: todayKey }).lean(),
    DailyActivity.findOne({ user: user._id, dateKey: todayKey }).lean(),
    Goal.find({ user: user._id }).lean(),
    computeUserStreaks(user._id),
  ]);

  return buildAiInsights({
    user,
    recentWorkouts,
    todayNutrition,
    todayActivity,
    goals,
    streakInfo,
  });
};

// GET /api/ai/insights
router.get('/insights', protect, async (req, res, next) => {
  try {
    const insights = await gatherContext(req.user);
    res.json({ insights });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/recommend-workouts
router.post(
  '/recommend-workouts',
  protect,
  [
    body('goal').optional().isIn(['weight_loss', 'muscle_gain', 'endurance', 'general_fitness']),
    body('fitnessLevel').optional().isIn(['beginner', 'intermediate', 'advanced']),
    body('duration').optional().isInt({ min: 10, max: 120 }),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const recommendations = recommendWorkouts({
        goal: req.body.goal || req.user.primaryGoal,
        fitnessLevel: req.body.fitnessLevel || req.user.fitnessLevel,
        duration: req.body.duration || 30,
      });
      res.json({ recommendations });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/chat
router.post(
  '/chat',
  protect,
  [body('prompt').trim().isLength({ min: 1, max: 500 }).withMessage('Please enter a message.')],
  validateRequest,
  async (req, res, next) => {
    try {
      const insights = await gatherContext(req.user);
      const reply = answerAiPrompt({
        prompt: req.body.prompt,
        insights,
        user: req.user,
      });
      res.json({ reply, insights });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
