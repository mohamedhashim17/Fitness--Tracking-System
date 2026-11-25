const Workout = require('../models/Workout');
const DailyActivity = require('../models/DailyActivity');
const Goal = require('../models/Goal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { toDateKey } = require('./dateUtils');

const BADGE_CATALOG = [
  {
    key: 'first_workout',
    name: 'First Rep',
    description: 'Logged your very first workout on FITNEX',
    points: 50,
  },
  {
    key: 'streak_3',
    name: '3-Day Spark',
    description: 'Maintained a 3-day consecutive workout streak',
    points: 100,
  },
  {
    key: 'streak_7',
    name: '7-Day Warrior',
    description: 'Maintained a 7-day consecutive workout streak',
    points: 250,
  },
  {
    key: 'streak_14',
    name: 'Unstoppable 14',
    description: 'Maintained a 14-day consecutive workout streak',
    points: 500,
  },
  {
    key: 'steps_10k',
    name: '10K Strider',
    description: 'Reached 10,000+ steps in a single day',
    points: 120,
  },
  {
    key: 'hydration_hero',
    name: 'Hydration Hero',
    description: 'Drank at least 2,500 ml of water in a single day',
    points: 100,
  },
  {
    key: 'calorie_crusher',
    name: 'Calorie Crusher',
    description: 'Burned 5,000+ total workout calories',
    points: 300,
  },
  {
    key: 'goal_getter',
    name: 'Goal Getter',
    description: 'Completed a personalized fitness goal',
    points: 200,
  },
];

/**
 * Computes consecutive workout streak and daily activity streak from real DB logs.
 */
const computeUserStreaks = async (userId) => {
  const [workouts, activities] = await Promise.all([
    Workout.find({ user: userId }).select('dateKey caloriesBurned').lean(),
    DailyActivity.find({ user: userId }).select('dateKey steps waterMl').lean(),
  ]);

  const workoutDates = new Set(workouts.map((w) => w.dateKey));
  const activityDates = new Set(
    activities
      .filter((a) => a.steps >= 3000 || a.waterMl >= 1500 || workoutDates.has(a.dateKey))
      .map((a) => a.dateKey)
  );
  // Also count workout dates toward active days
  for (const d of workoutDates) activityDates.add(d);

  const calcConsecutive = (dateSet) => {
    const todayKey = toDateKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    let cursor = new Date();
    if (!dateSet.has(todayKey)) {
      if (!dateSet.has(yesterdayKey)) return 0;
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (dateSet.has(toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };

  const calcLongest = (dateSet) => {
    const sorted = Array.from(dateSet).sort();
    if (!sorted.length) return 0;
    let longest = 1;
    let current = 1;
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(sorted[i - 1] + 'T12:00:00');
      const curr = new Date(sorted[i] + 'T12:00:00');
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current += 1;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }
    return longest;
  };

  const workoutStreak = calcConsecutive(workoutDates);
  const longestWorkoutStreak = calcLongest(workoutDates);
  const dailyActivityStreak = calcConsecutive(activityDates);
  const totalWorkoutCalories = workouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);

  return {
    workoutStreak,
    longestWorkoutStreak,
    dailyActivityStreak,
    totalWorkouts: workouts.length,
    totalWorkoutCalories,
    activities,
  };
};

/**
 * Evaluates and awards new badges, creating achievement notifications when unlocked.
 */
const syncUserAchievements = async (userId) => {
  const [user, streakInfo, completedGoalsCount] = await Promise.all([
    User.findById(userId),
    computeUserStreaks(userId),
    Goal.countDocuments({ user: userId, status: 'completed' }),
  ]);

  if (!user) return { badges: [], newlyEarned: [], streakInfo };

  const ownedKeys = new Set((user.badges || []).map((b) => b.key));
  const conditions = {
    first_workout: streakInfo.totalWorkouts >= 1,
    streak_3: streakInfo.longestWorkoutStreak >= 3 || streakInfo.workoutStreak >= 3,
    streak_7: streakInfo.longestWorkoutStreak >= 7 || streakInfo.workoutStreak >= 7,
    streak_14: streakInfo.longestWorkoutStreak >= 14 || streakInfo.workoutStreak >= 14,
    steps_10k: streakInfo.activities.some((a) => (a.steps || 0) >= 10000),
    hydration_hero: streakInfo.activities.some((a) => (a.waterMl || 0) >= 2500),
    calorie_crusher: streakInfo.totalWorkoutCalories >= 5000,
    goal_getter: completedGoalsCount >= 1,
  };

  const newlyEarned = [];
  for (const badge of BADGE_CATALOG) {
    if (conditions[badge.key] && !ownedKeys.has(badge.key)) {
      user.badges.push({
        key: badge.key,
        name: badge.name,
        description: badge.description,
        earnedAt: new Date(),
      });
      newlyEarned.push(badge);
    }
  }

  if (newlyEarned.length > 0) {
    await user.save();
    await Notification.insertMany(
      newlyEarned.map((b) => ({
        user: userId,
        title: `Badge Unlocked: ${b.name}!`,
        message: `${b.description} (+${b.points} pts)`,
        type: 'achievement',
      }))
    );
  }

  return {
    badges: user.badges,
    catalog: BADGE_CATALOG,
    newlyEarned,
    streakInfo,
  };
};

module.exports = {
  BADGE_CATALOG,
  computeUserStreaks,
  syncUserAchievements,
};
