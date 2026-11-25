const express = require('express');
const { body, param } = require('express-validator');
const Workout = require('../models/Workout');
const DailyActivity = require('../models/DailyActivity');
const { WORKOUT_CATEGORIES } = require('../models/Workout');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/errorMiddleware');
const { toDateKey } = require('../utils/dateUtils');
const { syncUserAchievements } = require('../utils/streakUtils');
const { syncUserGoals } = require('../utils/goalSync');

const router = express.Router();

// GET /api/workouts
router.get('/', protect, async (req, res, next) => {
  try {
    const { category, search, startDate, endDate } = req.query;
    const filter = { user: req.user._id };

    if (category && category !== 'All') filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      filter.dateKey = {};
      if (startDate) filter.dateKey.$gte = startDate;
      if (endDate) filter.dateKey.$lte = endDate;
    }

    const workouts = await Workout.find(filter).sort({ dateKey: -1, createdAt: -1 }).lean();
    res.json({ workouts });
  } catch (err) {
    next(err);
  }
});

// POST /api/workouts
router.post(
  '/',
  protect,
  [
    body('title').trim().isLength({ min: 2, max: 100 }).withMessage('Workout title must be 2-100 characters.'),
    body('category').isIn(WORKOUT_CATEGORIES).withMessage('Invalid workout category.'),
    body('duration').isInt({ min: 1, max: 600 }).withMessage('Duration must be 1-600 minutes.'),
    body('caloriesBurned').isInt({ min: 0, max: 5000 }).withMessage('Calories burned must be 0-5000.'),
    body('distanceKm').optional().isFloat({ min: 0, max: 500 }).withMessage('Invalid distance.'),
    body('intensity').optional().isIn(['Low', 'Moderate', 'High']).withMessage('Invalid intensity.'),
    body('dateKey').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD.'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const dateKey = req.body.dateKey || toDateKey();
      const workout = await Workout.create({
        user: req.user._id,
        title: req.body.title,
        category: req.body.category,
        duration: Number(req.body.duration),
        caloriesBurned: Number(req.body.caloriesBurned),
        distanceKm: Number(req.body.distanceKm || 0),
        intensity: req.body.intensity || 'Moderate',
        sets: Number(req.body.sets || 0),
        reps: Number(req.body.reps || 0),
        weightLiftedKg: Number(req.body.weightLiftedKg || 0),
        dateKey,
        notes: req.body.notes || '',
      });

      // If distance-based workout logged, ensure daily activity reflects distance/steps estimate
      if (workout.distanceKm > 0 && ['Running', 'Walking'].includes(workout.category)) {
        const estimatedSteps = Math.round(workout.distanceKm * (workout.category === 'Running' ? 1250 : 1350));
        await DailyActivity.findOneAndUpdate(
          { user: req.user._id, dateKey },
          {
            $inc: { steps: estimatedSteps, distanceKm: workout.distanceKm },
            $setOnInsert: { user: req.user._id, dateKey },
          },
          { upsert: true }
        );
      }

      await syncUserGoals(req.user._id);
      const { newlyEarned } = await syncUserAchievements(req.user._id);

      res.status(201).json({ workout, newlyEarned });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/workouts/:id
router.put(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid workout ID.'),
    body('title').optional().trim().isLength({ min: 2, max: 100 }),
    body('category').optional().isIn(WORKOUT_CATEGORIES),
    body('duration').optional().isInt({ min: 1, max: 600 }),
    body('caloriesBurned').optional().isInt({ min: 0, max: 5000 }),
    body('dateKey').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
      if (!workout) {
        return res.status(404).json({ message: 'Workout record not found.' });
      }

      const fields = [
        'title',
        'category',
        'duration',
        'caloriesBurned',
        'distanceKm',
        'intensity',
        'sets',
        'reps',
        'weightLiftedKg',
        'dateKey',
        'notes',
      ];
      for (const f of fields) {
        if (req.body[f] !== undefined) workout[f] = req.body[f];
      }

      await workout.save();
      await syncUserGoals(req.user._id);
      await syncUserAchievements(req.user._id);

      res.json({ workout });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/workouts/:id
router.delete(
  '/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid workout ID.')],
  validateRequest,
  async (req, res, next) => {
    try {
      const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!workout) {
        return res.status(404).json({ message: 'Workout record not found.' });
      }
      await syncUserGoals(req.user._id);
      res.json({ message: 'Workout deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
