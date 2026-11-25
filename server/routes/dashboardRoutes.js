const express = require('express');
const { body } = require('express-validator');
const Workout = require('../models/Workout');
const NutritionLog = require('../models/NutritionLog');
const DailyActivity = require('../models/DailyActivity');
const Goal = require('../models/Goal');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/errorMiddleware');
const { toDateKey, getPastDateKeys, formatShortDate } = require('../utils/dateUtils');
const { syncUserAchievements } = require('../utils/streakUtils');
const { syncUserGoals } = require('../utils/goalSync');

const router = express.Router();

// GET /api/dashboard
router.get('/', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const todayKey = toDateKey();
    const monthKeys = getPastDateKeys(30);
    const weekKeys = monthKeys.slice(-7);

    const [
      workouts,
      nutritionLogs,
      activities,
      goals,
      achievements,
      notifications,
    ] = await Promise.all([
      Workout.find({ user: userId, dateKey: { $gte: monthKeys[0] } }).sort({ dateKey: -1, createdAt: -1 }).lean(),
      NutritionLog.find({ user: userId, dateKey: { $gte: monthKeys[0] } }).lean(),
      DailyActivity.find({ user: userId, dateKey: { $gte: monthKeys[0] } }).lean(),
      syncUserGoals(userId),
      syncUserAchievements(userId),
      Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const activityMap = new Map(activities.map((a) => [a.dateKey, a]));

    // Today's metrics
    const todayActivity = activityMap.get(todayKey) || { steps: 0, distanceKm: 0, waterMl: 0 };
    const todayWorkouts = workouts.filter((w) => w.dateKey === todayKey);
    const todayNutrition = nutritionLogs.filter((n) => n.dateKey === todayKey);

    const workoutCaloriesToday = todayWorkouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);
    const stepCaloriesToday = Math.round((todayActivity.steps || 0) * 0.04);
    const caloriesBurnedToday = workoutCaloriesToday + stepCaloriesToday;

    const activeMinutesToday = todayWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
    const workoutDistanceToday = todayWorkouts.reduce((s, w) => s + (w.distanceKm || 0), 0);
    const distanceKmToday = Number(
      Math.max(todayActivity.distanceKm || 0, (todayActivity.steps || 0) * 0.00075, workoutDistanceToday).toFixed(2)
    );

    const caloriesConsumedToday = todayNutrition.reduce((s, n) => s + (n.calories || 0), 0);
    const macrosToday = todayNutrition.reduce(
      (acc, n) => ({
        protein: acc.protein + (n.protein || 0),
        carbs: acc.carbs + (n.carbs || 0),
        fat: acc.fat + (n.fat || 0),
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );

    const targets = req.user.dailyTargets || {
      steps: 10000,
      caloriesBurn: 550,
      caloriesIntake: 2200,
      waterMl: 2500,
      weeklyWorkouts: 4,
    };

    const dailyProgress = {
      stepsPct: Math.min(100, Math.round(((todayActivity.steps || 0) / (targets.steps || 10000)) * 100)),
      caloriesBurnPct: Math.min(100, Math.round((caloriesBurnedToday / (targets.caloriesBurn || 550)) * 100)),
      waterPct: Math.min(100, Math.round(((todayActivity.waterMl || 0) / (targets.waterMl || 2500)) * 100)),
      calorieIntakePct: Math.min(100, Math.round((caloriesConsumedToday / (targets.caloriesIntake || 2200)) * 100)),
    };

    const buildDayPoint = (key) => {
      const act = activityMap.get(key);
      const dayWorkouts = workouts.filter((w) => w.dateKey === key);
      const dayMeals = nutritionLogs.filter((n) => n.dateKey === key);
      const steps = act?.steps || 0;
      const wCal = dayWorkouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);
      const burned = wCal + Math.round(steps * 0.04);
      const intake = dayMeals.reduce((s, n) => s + (n.calories || 0), 0);
      const activeMinutes = dayWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
      const waterMl = act?.waterMl || 0;
      return {
        dateKey: key,
        label: formatShortDate(key),
        steps,
        caloriesBurned: burned,
        caloriesIntake: intake,
        activeMinutes,
        waterMl,
        workoutsCount: dayWorkouts.length,
      };
    };

    const monthlySummary = monthKeys.map(buildDayPoint);
    const weeklySummary = monthlySummary.slice(-7);

    res.json({
      today: {
        dateKey: todayKey,
        steps: todayActivity.steps || 0,
        caloriesBurned: caloriesBurnedToday,
        workoutCalories: workoutCaloriesToday,
        stepCalories: stepCaloriesToday,
        distanceKm: distanceKmToday,
        activeMinutes: activeMinutesToday,
        waterMl: todayActivity.waterMl || 0,
        caloriesConsumed: caloriesConsumedToday,
        macros: macrosToday,
        workoutsCount: todayWorkouts.length,
      },
      targets,
      dailyProgress,
      weeklySummary,
      monthlySummary,
      streaks: {
        workoutStreak: achievements.streakInfo.workoutStreak,
        longestWorkoutStreak: achievements.streakInfo.longestWorkoutStreak,
        dailyActivityStreak: achievements.streakInfo.dailyActivityStreak,
      },
      badges: achievements.badges,
      recentWorkouts: workouts.slice(0, 5),
      goals,
      notifications,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/dashboard/activity
router.put(
  '/activity',
  protect,
  [
    body('dateKey').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Invalid date format (YYYY-MM-DD).'),
    body('steps').optional().isInt({ min: 0, max: 200000 }).withMessage('Steps must be 0-200,000.'),
    body('distanceKm').optional().isFloat({ min: 0, max: 500 }).withMessage('Distance must be 0-500 km.'),
    body('waterMl').optional().isInt({ min: 0, max: 20000 }).withMessage('Water intake must be 0-20,000 ml.'),
    body('addWaterMl').optional().isInt({ min: -5000, max: 5000 }).withMessage('Water adjustment out of range.'),
    body('addSteps').optional().isInt({ min: -50000, max: 50000 }).withMessage('Steps adjustment out of range.'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const dateKey = req.body.dateKey || toDateKey();
      let doc = await DailyActivity.findOne({ user: req.user._id, dateKey });

      if (!doc) {
        doc = new DailyActivity({ user: req.user._id, dateKey });
      }

      if (req.body.steps !== undefined) {
        doc.steps = Number(req.body.steps);
        if (req.body.distanceKm === undefined) {
          doc.distanceKm = Number((doc.steps * 0.00075).toFixed(2));
        }
      }
      if (req.body.addSteps !== undefined) {
        doc.steps = Math.max(0, (doc.steps || 0) + Number(req.body.addSteps));
        if (req.body.distanceKm === undefined) {
          doc.distanceKm = Number((doc.steps * 0.00075).toFixed(2));
        }
      }
      if (req.body.distanceKm !== undefined) {
        doc.distanceKm = Number(req.body.distanceKm);
      }
      if (req.body.waterMl !== undefined) {
        doc.waterMl = Number(req.body.waterMl);
      }
      if (req.body.addWaterMl !== undefined) {
        doc.waterMl = Math.max(0, (doc.waterMl || 0) + Number(req.body.addWaterMl));
      }

      await doc.save();

      await syncUserGoals(req.user._id);
      const { newlyEarned } = await syncUserAchievements(req.user._id);

      res.json({ activity: doc, newlyEarned });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
