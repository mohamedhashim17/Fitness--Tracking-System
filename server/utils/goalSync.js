const Goal = require('../models/Goal');
const Workout = require('../models/Workout');
const DailyActivity = require('../models/DailyActivity');
const NutritionLog = require('../models/NutritionLog');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { toDateKey, getPastDateKeys } = require('./dateUtils');

/**
 * Dynamically synchronizes a user's goals against real database records
 * and emits an achievement notification when a goal hits 100%.
 */
const syncUserGoals = async (userId) => {
  const todayKey = toDateKey();
  const weekKeys = getPastDateKeys(7);

  const [goals, user, todayActivity, weekWorkoutsCount, todayNutrition] = await Promise.all([
    Goal.find({ user: userId }),
    User.findById(userId).select('weightKg'),
    DailyActivity.findOne({ user: userId, dateKey: todayKey }),
    Workout.countDocuments({ user: userId, dateKey: { $in: weekKeys } }),
    NutritionLog.find({ user: userId, dateKey: todayKey }).select('calories'),
  ]);

  const todayCalories = todayNutrition.reduce((s, n) => s + (n.calories || 0), 0);
  const completedNotifications = [];

  for (const goal of goals) {
    let updatedCurrent = goal.currentValue;
    let isMet = false;

    switch (goal.type) {
      case 'daily_steps':
        updatedCurrent = todayActivity?.steps || 0;
        isMet = updatedCurrent >= goal.targetValue;
        break;
      case 'daily_water':
        updatedCurrent = todayActivity?.waterMl || 0;
        isMet = updatedCurrent >= goal.targetValue;
        break;
      case 'weekly_workouts':
        updatedCurrent = weekWorkoutsCount;
        isMet = updatedCurrent >= goal.targetValue;
        break;
      case 'daily_calories':
        updatedCurrent = todayCalories;
        isMet = updatedCurrent >= goal.targetValue;
        break;
      case 'weight_loss':
        updatedCurrent = user?.weightKg ?? goal.currentValue;
        isMet = updatedCurrent <= goal.targetValue;
        break;
      case 'muscle_gain':
        updatedCurrent = user?.weightKg ?? goal.currentValue;
        isMet = updatedCurrent >= goal.targetValue;
        break;
      default:
        break;
    }

    goal.currentValue = updatedCurrent;

    if (isMet && goal.status !== 'completed') {
      goal.status = 'completed';
      goal.completedAt = new Date();
      completedNotifications.push({
        user: userId,
        title: `Goal Achieved: ${goal.title}!`,
        message: `You hit your target of ${goal.targetValue} ${goal.unit}. Incredible discipline!`,
        type: 'goal',
      });
    } else if (!isMet && goal.status === 'completed' && ['daily_steps', 'daily_water', 'daily_calories', 'weekly_workouts'].includes(goal.type)) {
      // Recurring daily/weekly goals reset to active when today's/week's count is below target
      goal.status = 'active';
      goal.completedAt = undefined;
    }

    await goal.save();
  }

  if (completedNotifications.length > 0) {
    await Notification.insertMany(completedNotifications);
  }

  return goals;
};

module.exports = { syncUserGoals };
