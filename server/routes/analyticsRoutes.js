const express = require('express');
const Workout = require('../models/Workout');
const NutritionLog = require('../models/NutritionLog');
const DailyActivity = require('../models/DailyActivity');
const BodyMetric = require('../models/BodyMetric');
const { protect } = require('../middleware/authMiddleware');
const { getPastDateKeys, formatShortDate } = require('../utils/dateUtils');
const { syncUserGoals } = require('../utils/goalSync');

const router = express.Router();

const buildAnalyticsPayload = async (userId, rangeDays) => {
  const days = Math.min(90, Math.max(7, Number(rangeDays) || 30));
  const keys = getPastDateKeys(days);
  const weekKeys = keys.slice(-7);

  const [workouts, nutrition, activities, metrics, goals] = await Promise.all([
    Workout.find({ user: userId, dateKey: { $gte: keys[0] } }).sort({ dateKey: 1 }).lean(),
    NutritionLog.find({ user: userId, dateKey: { $gte: keys[0] } }).lean(),
    DailyActivity.find({ user: userId, dateKey: { $gte: keys[0] } }).lean(),
    BodyMetric.find({ user: userId }).sort({ dateKey: 1 }).lean(),
    syncUserGoals(userId),
  ]);

  const actMap = new Map(activities.map((a) => [a.dateKey, a]));

  const dailySeries = keys.map((k) => {
    const act = actMap.get(k);
    const dayWorkouts = workouts.filter((w) => w.dateKey === k);
    const dayFood = nutrition.filter((n) => n.dateKey === k);
    const steps = act?.steps || 0;
    const workoutCalories = dayWorkouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);
    const totalBurned = workoutCalories + Math.round(steps * 0.04);
    const intake = dayFood.reduce((s, f) => s + (f.calories || 0), 0);
    const workoutMinutes = dayWorkouts.reduce((s, w) => s + (w.duration || 0), 0);

    return {
      dateKey: k,
      label: formatShortDate(k),
      steps,
      waterMl: act?.waterMl || 0,
      workoutCalories,
      caloriesBurned: totalBurned,
      caloriesIntake: intake,
      workoutMinutes,
      workoutsCount: dayWorkouts.length,
    };
  });

  // Category distribution
  const categoryMap = new Map();
  for (const w of workouts) {
    const prev = categoryMap.get(w.category) || { category: w.category, sessions: 0, minutes: 0, calories: 0 };
    prev.sessions += 1;
    prev.minutes += w.duration || 0;
    prev.calories += w.caloriesBurned || 0;
    categoryMap.set(w.category, prev);
  }

  // Goal completion %
  const goalCompletionList = goals.map((g) => {
    let pct = 0;
    if (g.status === 'completed') {
      pct = 100;
    } else if (g.type === 'weight_loss') {
      const span = Math.max(0.1, (g.startValue || g.currentValue) - g.targetValue);
      const done = Math.max(0, (g.startValue || g.currentValue) - g.currentValue);
      pct = Math.min(100, Math.round((done / span) * 100));
    } else {
      pct = Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 1)) * 100));
    }
    return { _id: g._id, title: g.title, type: g.type, status: g.status, pct };
  });

  const avgGoalCompletionPct = goalCompletionList.length
    ? Math.round(goalCompletionList.reduce((s, g) => s + g.pct, 0) / goalCompletionList.length)
    : 0;

  const weeklyRows = dailySeries.filter((d) => weekKeys.includes(d.dateKey));
  const summary = {
    rangeDays: days,
    totalWorkouts: workouts.length,
    totalWorkoutMinutes: workouts.reduce((s, w) => s + (w.duration || 0), 0),
    totalCaloriesBurned: dailySeries.reduce((s, d) => s + d.caloriesBurned, 0),
    totalCaloriesIntake: dailySeries.reduce((s, d) => s + d.caloriesIntake, 0),
    totalSteps: dailySeries.reduce((s, d) => s + d.steps, 0),
    avgDailySteps: Math.round(dailySeries.reduce((s, d) => s + d.steps, 0) / days),
    weeklyWorkouts: weeklyRows.reduce((s, d) => s + d.workoutsCount, 0),
    weeklyMinutes: weeklyRows.reduce((s, d) => s + d.workoutMinutes, 0),
    weeklyCaloriesBurned: weeklyRows.reduce((s, d) => s + d.caloriesBurned, 0),
    avgGoalCompletionPct,
  };

  return {
    summary,
    dailySeries,
    weeklySeries: weeklyRows,
    categoryBreakdown: Array.from(categoryMap.values()),
    weightProgress: metrics.map((m) => ({
      dateKey: m.dateKey,
      label: formatShortDate(m.dateKey),
      weightKg: m.weightKg,
      bmi: m.bmi,
    })),
    goalCompletion: goalCompletionList,
  };
};

// GET /api/analytics
router.get('/', protect, async (req, res, next) => {
  try {
    const payload = await buildAnalyticsPayload(req.user._id, req.query.range);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/export?format=csv&range=30
router.get('/export', protect, async (req, res, next) => {
  try {
    const payload = await buildAnalyticsPayload(req.user._id, req.query.range || 30);
    const headers = [
      'Date',
      'Steps',
      'Water (ml)',
      'Workouts',
      'Workout Minutes',
      'Calories Burned',
      'Calories Intake',
    ];
    const rows = payload.dailySeries.map((d) =>
      [d.dateKey, d.steps, d.waterMl, d.workoutsCount, d.workoutMinutes, d.caloriesBurned, d.caloriesIntake].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fitnex-report-${payload.summary.rangeDays}d.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
