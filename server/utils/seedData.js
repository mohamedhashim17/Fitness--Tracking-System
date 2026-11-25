const User = require('../models/User');
const Workout = require('../models/Workout');
const NutritionLog = require('../models/NutritionLog');
const DailyActivity = require('../models/DailyActivity');
const Goal = require('../models/Goal');
const BodyMetric = require('../models/BodyMetric');
const Notification = require('../models/Notification');
const { toDateKey, calculateBmi } = require('./dateUtils');
const { syncUserAchievements } = require('./streakUtils');
const { syncUserGoals } = require('./goalSync');

const daysAgoKey = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

/**
 * Seeds demo accounts and realistic multi-day workout/nutrition/metrics data
 * ONLY when the database has zero users, so the leaderboard and demo login work immediately
 * without hardcoding static frontend dummy data.
 */
const seedDemoIfEmpty = async () => {
  const count = await User.countDocuments();
  if (count > 0) return;

  console.log('Seeding initial FITNEX community & demo records into MongoDB...');

  const demoUsersData = [
    {
      name: 'Alex Mercer',
      email: 'alex@fitnex.app',
      password: 'Password123!',
      age: 27,
      gender: 'male',
      heightCm: 178,
      weightKg: 76.4,
      fitnessLevel: 'intermediate',
      primaryGoal: 'muscle_gain',
      dailyTargets: {
        steps: 10000,
        caloriesBurn: 600,
        caloriesIntake: 2450,
        proteinG: 165,
        carbsG: 270,
        fatG: 75,
        waterMl: 3000,
        weeklyWorkouts: 5,
      },
    },
    {
      name: 'Maya Lin',
      email: 'maya@fitnex.app',
      password: 'Password123!',
      age: 25,
      gender: 'female',
      heightCm: 166,
      weightKg: 58.2,
      fitnessLevel: 'advanced',
      primaryGoal: 'endurance',
    },
    {
      name: 'Jordan Vance',
      email: 'jordan@fitnex.app',
      password: 'Password123!',
      age: 31,
      gender: 'male',
      heightCm: 182,
      weightKg: 84.5,
      fitnessLevel: 'intermediate',
      primaryGoal: 'weight_loss',
    },
    {
      name: 'Sofia Patel',
      email: 'sofia@fitnex.app',
      password: 'Password123!',
      age: 24,
      gender: 'female',
      heightCm: 163,
      weightKg: 55.8,
      fitnessLevel: 'beginner',
      primaryGoal: 'general_fitness',
    },
  ];

  const users = [];
  for (const u of demoUsersData) {
    const created = await User.create(u);
    users.push(created);
  }

  const [alex, maya, jordan, sofia] = users;

  // Populate 14 days of realistic activity & workouts for Alex (primary demo account)
  const alexWorkouts = [
    { title: 'Morning 5K Tempo Run', category: 'Running', duration: 32, caloriesBurned: 360, distanceKm: 5.2, intensity: 'High', dateKey: daysAgoKey(0), notes: 'Strong negative split on final km.' },
    { title: 'Upper Body Strength', category: 'Strength Training', duration: 48, caloriesBurned: 310, distanceKm: 0, intensity: 'High', sets: 16, reps: 10, weightLiftedKg: 75, dateKey: daysAgoKey(1), notes: 'New bench press PR!' },
    { title: 'Evening Power Walk', category: 'Walking', duration: 35, caloriesBurned: 165, distanceKm: 3.1, intensity: 'Low', dateKey: daysAgoKey(2) },
    { title: 'HIIT Spin & Core', category: 'Cycling', duration: 40, caloriesBurned: 420, distanceKm: 16.4, intensity: 'High', dateKey: daysAgoKey(3) },
    { title: 'Full Body Gym Circuit', category: 'Gym', duration: 55, caloriesBurned: 460, distanceKm: 0, intensity: 'High', sets: 18, reps: 12, weightLiftedKg: 60, dateKey: daysAgoKey(4) },
    { title: 'Recovery Vinyasa Flow', category: 'Yoga', duration: 30, caloriesBurned: 130, distanceKm: 0, intensity: 'Low', dateKey: daysAgoKey(5) },
    { title: 'Pool Lap Endurance', category: 'Swimming', duration: 45, caloriesBurned: 480, distanceKm: 1.8, intensity: 'High', dateKey: daysAgoKey(6) },
    { title: 'Zone 2 Road Run', category: 'Running', duration: 38, caloriesBurned: 390, distanceKm: 6.0, intensity: 'Moderate', dateKey: daysAgoKey(8) },
    { title: 'Lower Body Hypertrophy', category: 'Strength Training', duration: 50, caloriesBurned: 375, distanceKm: 0, intensity: 'High', sets: 15, reps: 8, weightLiftedKg: 100, dateKey: daysAgoKey(10) },
    { title: 'Outdoor Trail Cycling', category: 'Cycling', duration: 60, caloriesBurned: 540, distanceKm: 22.5, intensity: 'Moderate', dateKey: daysAgoKey(12) },
  ];

  await Workout.insertMany(alexWorkouts.map((w) => ({ ...w, user: alex._id })));

  // Daily activities for Alex across last 10 days
  const alexActivities = [
    { dateKey: daysAgoKey(0), steps: 9420, distanceKm: 7.1, waterMl: 2250 },
    { dateKey: daysAgoKey(1), steps: 11240, distanceKm: 8.4, waterMl: 2750 },
    { dateKey: daysAgoKey(2), steps: 8650, distanceKm: 6.4, waterMl: 2500 },
    { dateKey: daysAgoKey(3), steps: 10310, distanceKm: 7.8, waterMl: 3000 },
    { dateKey: daysAgoKey(4), steps: 12100, distanceKm: 9.1, waterMl: 2800 },
    { dateKey: daysAgoKey(5), steps: 7200, distanceKm: 5.3, waterMl: 2200 },
    { dateKey: daysAgoKey(6), steps: 10850, distanceKm: 8.1, waterMl: 2900 },
    { dateKey: daysAgoKey(7), steps: 6400, distanceKm: 4.8, waterMl: 2000 },
    { dateKey: daysAgoKey(8), steps: 11500, distanceKm: 8.7, waterMl: 2600 },
    { dateKey: daysAgoKey(9), steps: 8900, distanceKm: 6.7, waterMl: 2400 },
  ];
  await DailyActivity.insertMany(alexActivities.map((a) => ({ ...a, user: alex._id })));

  // Today's & yesterday's nutrition for Alex
  await NutritionLog.insertMany([
    { user: alex._id, dateKey: daysAgoKey(0), mealType: 'Breakfast', foodName: 'Oatmeal, Whey & Blueberries', servingSize: '1 bowl', calories: 460, protein: 34, carbs: 58, fat: 10 },
    { user: alex._id, dateKey: daysAgoKey(0), mealType: 'Lunch', foodName: 'Grilled Chicken Quinoa Bowl', servingSize: '420g', calories: 640, protein: 52, carbs: 64, fat: 18 },
    { user: alex._id, dateKey: daysAgoKey(0), mealType: 'Snacks', foodName: 'Greek Yogurt & Almonds', servingSize: '200g', calories: 280, protein: 22, carbs: 14, fat: 14 },
    { user: alex._id, dateKey: daysAgoKey(0), mealType: 'Dinner', foodName: 'Wild Salmon, Sweet Potato & Broccoli', servingSize: '450g', calories: 690, protein: 46, carbs: 56, fat: 26 },
    { user: alex._id, dateKey: daysAgoKey(1), mealType: 'Breakfast', foodName: 'Scrambled Eggs & Avocado Toast', servingSize: '2 slices', calories: 510, protein: 28, carbs: 42, fat: 24 },
    { user: alex._id, dateKey: daysAgoKey(1), mealType: 'Lunch', foodName: 'Turkey Breast Wrap & Greens', servingSize: '1 wrap', calories: 580, protein: 44, carbs: 54, fat: 17 },
    { user: alex._id, dateKey: daysAgoKey(1), mealType: 'Dinner', foodName: 'Lean Beef Stir-Fry & Jasmine Rice', servingSize: '480g', calories: 760, protein: 54, carbs: 78, fat: 22 },
  ]);

  // Body metrics history for Alex
  const weights = [
    { daysAgo: 35, weightKg: 78.6, bodyFatPct: 17.8, waistCm: 84.5 },
    { daysAgo: 28, weightKg: 78.1, bodyFatPct: 17.4, waistCm: 84.0 },
    { daysAgo: 21, weightKg: 77.6, bodyFatPct: 16.9, waistCm: 83.2 },
    { daysAgo: 14, weightKg: 77.1, bodyFatPct: 16.4, waistCm: 82.6 },
    { daysAgo: 7, weightKg: 76.8, bodyFatPct: 16.0, waistCm: 82.0 },
    { daysAgo: 0, weightKg: 76.4, bodyFatPct: 15.6, waistCm: 81.5 },
  ];
  await BodyMetric.insertMany(
    weights.map((entry) => {
      const { bmi, category } = calculateBmi(entry.weightKg, alex.heightCm);
      return {
        user: alex._id,
        dateKey: daysAgoKey(entry.daysAgo),
        weightKg: entry.weightKg,
        heightCm: alex.heightCm,
        bmi,
        bmiCategory: category,
        bodyFatPct: entry.bodyFatPct,
        chestCm: 102,
        waistCm: entry.waistCm,
        hipsCm: 96,
        armsCm: 37.5,
        thighsCm: 57,
      };
    })
  );

  // Personalized goals for Alex
  await Goal.insertMany([
    { user: alex._id, title: 'Daily 10K Step Challenge', type: 'daily_steps', startValue: 0, targetValue: 10000, currentValue: 9420, unit: 'steps' },
    { user: alex._id, title: '5 Workouts Every Week', type: 'weekly_workouts', startValue: 0, targetValue: 5, currentValue: 5, unit: 'workouts' },
    { user: alex._id, title: 'Lean Target Weight', type: 'weight_loss', startValue: 78.6, targetValue: 75.0, currentValue: 76.4, unit: 'kg' },
    { user: alex._id, title: '3L Daily Hydration', type: 'daily_water', startValue: 0, targetValue: 3000, currentValue: 2250, unit: 'ml' },
  ]);

  // Seed workouts & steps for other leaderboard athletes
  const peerConfigs = [
    { user: maya, steps: [13200, 12400, 11800, 14100, 10900, 12600, 11500], workouts: [
      { title: '10K Endurance Run', category: 'Running', duration: 54, caloriesBurned: 610, distanceKm: 10.2, intensity: 'High', dateKey: daysAgoKey(0) },
      { title: 'Cycling Hill Climb', category: 'Cycling', duration: 60, caloriesBurned: 580, distanceKm: 24.0, intensity: 'High', dateKey: daysAgoKey(1) },
      { title: 'Swim Speed Sets', category: 'Swimming', duration: 45, caloriesBurned: 490, distanceKm: 2.0, intensity: 'High', dateKey: daysAgoKey(2) },
      { title: 'Core & Mobility', category: 'Yoga', duration: 35, caloriesBurned: 160, distanceKm: 0, intensity: 'Moderate', dateKey: daysAgoKey(3) },
      { title: 'Track Intervals', category: 'Running', duration: 42, caloriesBurned: 470, distanceKm: 7.4, intensity: 'High', dateKey: daysAgoKey(4) },
      { title: 'Recovery Ride', category: 'Cycling', duration: 40, caloriesBurned: 340, distanceKm: 15.0, intensity: 'Moderate', dateKey: daysAgoKey(5) },
    ] },
    { user: jordan, steps: [8900, 9500, 10200, 8100, 9700, 10400, 7800], workouts: [
      { title: 'Strength Push Day', category: 'Strength Training', duration: 50, caloriesBurned: 380, distanceKm: 0, intensity: 'High', dateKey: daysAgoKey(0) },
      { title: 'Treadmill Incline Walk', category: 'Walking', duration: 40, caloriesBurned: 270, distanceKm: 4.2, intensity: 'Moderate', dateKey: daysAgoKey(2) },
      { title: 'Gym Pull Day', category: 'Gym', duration: 55, caloriesBurned: 410, distanceKm: 0, intensity: 'High', dateKey: daysAgoKey(4) },
    ] },
    { user: sofia, steps: [7400, 8200, 6900, 9100, 7700, 8500, 7200], workouts: [
      { title: 'Morning Yoga Stretch', category: 'Yoga', duration: 30, caloriesBurned: 135, distanceKm: 0, intensity: 'Low', dateKey: daysAgoKey(0) },
      { title: 'Park Walk', category: 'Walking', duration: 45, caloriesBurned: 210, distanceKm: 4.0, intensity: 'Moderate', dateKey: daysAgoKey(2) },
      { title: 'Indoor Spin Class', category: 'Cycling', duration: 35, caloriesBurned: 310, distanceKm: 13.0, intensity: 'Moderate', dateKey: daysAgoKey(5) },
    ] },
  ];

  for (const p of peerConfigs) {
    await DailyActivity.insertMany(
      p.steps.map((s, idx) => ({
        user: p.user._id,
        dateKey: daysAgoKey(idx),
        steps: s,
        distanceKm: Number((s * 0.00075).toFixed(2)),
        waterMl: 2500,
      }))
    );
    await Workout.insertMany(p.workouts.map((w) => ({ ...w, user: p.user._id })));
    await syncUserAchievements(p.user._id);
  }

  await syncUserGoals(alex._id);
  await syncUserAchievements(alex._id);

  await Notification.create({
    user: alex._id,
    title: 'Welcome to FITNEX',
    message: 'Your personalized fitness dashboard is live. Stay hydrated and crush today’s step target!',
    type: 'reminder',
  });
};

module.exports = { seedDemoIfEmpty };
