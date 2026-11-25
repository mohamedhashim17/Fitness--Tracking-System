const express = require('express');
const { body, param } = require('express-validator');
const Goal = require('../models/Goal');
const { GOAL_TYPES } = require('../models/Goal');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/errorMiddleware');
const { syncUserGoals } = require('../utils/goalSync');
const { syncUserAchievements } = require('../utils/streakUtils');

const router = express.Router();

const DEFAULT_UNITS = {
  daily_steps: 'steps',
  weekly_workouts: 'workouts',
  weight_loss: 'kg',
  muscle_gain: 'kg',
  daily_calories: 'kcal',
  daily_water: 'ml',
};

// GET /api/goals
router.get('/', protect, async (req, res, next) => {
  try {
    const [goals, achievements] = await Promise.all([
      syncUserGoals(req.user._id),
      syncUserAchievements(req.user._id),
    ]);
    res.json({
      goals,
      streaks: achievements.streakInfo,
      badges: achievements.badges,
      badgeCatalog: achievements.catalog,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/goals
router.post(
  '/',
  protect,
  [
    body('title').trim().isLength({ min: 2, max: 100 }).withMessage('Goal title must be 2-100 characters.'),
    body('type').isIn(GOAL_TYPES).withMessage('Invalid goal type.'),
    body('targetValue').isFloat({ min: 1 }).withMessage('Target value must be greater than 0.'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { title, type, targetValue, startValue, unit, deadline } = req.body;
      const defaultStart =
        type === 'weight_loss' || type === 'muscle_gain' ? req.user.weightKg : 0;

      const goal = await Goal.create({
        user: req.user._id,
        title,
        type,
        startValue: startValue !== undefined ? Number(startValue) : defaultStart,
        targetValue: Number(targetValue),
        currentValue: defaultStart,
        unit: unit || DEFAULT_UNITS[type] || 'units',
        ...(deadline && { deadline: new Date(deadline) }),
      });

      const goals = await syncUserGoals(req.user._id);
      const { newlyEarned } = await syncUserAchievements(req.user._id);
      const updated = goals.find((g) => String(g._id) === String(goal._id)) || goal;

      res.status(201).json({ goal: updated, newlyEarned });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/goals/:id
router.put(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid goal ID.'),
    body('title').optional().trim().isLength({ min: 2, max: 100 }),
    body('targetValue').optional().isFloat({ min: 1 }),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
      if (!goal) return res.status(404).json({ message: 'Goal not found.' });

      const fields = ['title', 'targetValue', 'startValue', 'currentValue', 'unit', 'deadline', 'status'];
      for (const f of fields) {
        if (req.body[f] !== undefined) goal[f] = req.body[f];
      }
      await goal.save();

      await syncUserGoals(req.user._id);
      const { newlyEarned } = await syncUserAchievements(req.user._id);
      const refreshed = await Goal.findById(goal._id);
      res.json({ goal: refreshed, newlyEarned });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/goals/:id
router.delete(
  '/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid goal ID.')],
  validateRequest,
  async (req, res, next) => {
    try {
      const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!goal) return res.status(404).json({ message: 'Goal not found.' });
      res.json({ message: 'Goal deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
