const express = require('express');
const User = require('../models/User');
const Workout = require('../models/Workout');
const DailyActivity = require('../models/DailyActivity');
const { protect } = require('../middleware/authMiddleware');
const { getPastDateKeys } = require('../utils/dateUtils');
const { BADGE_CATALOG, computeUserStreaks } = require('../utils/streakUtils');

const router = express.Router();

const POINTS_MAP = new Map(BADGE_CATALOG.map((b) => [b.key, b.points]));

// GET /api/leaderboard?sortBy=steps|minutes|calories|points
router.get('/', protect, async (req, res, next) => {
  try {
    const sortBy = req.query.sortBy || 'steps';
    const weekKeys = getPastDateKeys(7);

    const [users, weekWorkouts, weekActivities] = await Promise.all([
      User.find().select('name fitnessLevel primaryGoal badges').lean(),
      Workout.find({ dateKey: { $gte: weekKeys[0] } }).select('user duration caloriesBurned').lean(),
      DailyActivity.find({ dateKey: { $gte: weekKeys[0] } }).select('user steps').lean(),
    ]);

    const rows = await Promise.all(
      users.map(async (u) => {
        const uid = String(u._id);
        const uWorkouts = weekWorkouts.filter((w) => String(w.user) === uid);
        const uActivities = weekActivities.filter((a) => String(a.user) === uid);
        const streaks = await computeUserStreaks(u._id);

        const weeklySteps = uActivities.reduce((s, a) => s + (a.steps || 0), 0);
        const weeklyMinutes = uWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
        const weeklyCalories =
          uWorkouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0) + Math.round(weeklySteps * 0.04);
        const badgePoints = (u.badges || []).reduce((s, b) => s + (POINTS_MAP.get(b.key) || 50), 0);
        const achievementScore = badgePoints + streaks.workoutStreak * 25 + uWorkouts.length * 15;

        return {
          userId: uid,
          name: u.name,
          fitnessLevel: u.fitnessLevel,
          primaryGoal: u.primaryGoal,
          weeklySteps,
          weeklyMinutes,
          weeklyWorkouts: uWorkouts.length,
          weeklyCalories,
          workoutStreak: streaks.workoutStreak,
          badgesCount: (u.badges || []).length,
          achievementScore,
          isCurrentUser: uid === String(req.user._id),
        };
      })
    );

    const sortKeyMap = {
      steps: 'weeklySteps',
      minutes: 'weeklyMinutes',
      calories: 'weeklyCalories',
      points: 'achievementScore',
    };
    const key = sortKeyMap[sortBy] || 'weeklySteps';
    rows.sort((a, b) => b[key] - a[key]);

    const ranked = rows.map((r, index) => ({ ...r, rank: index + 1 }));
    res.json({ leaderboard: ranked, sortBy });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
