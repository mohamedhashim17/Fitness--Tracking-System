const { calculateBmi, getPastDateKeys } = require('./dateUtils');

const WORKOUT_TEMPLATES = {
  weight_loss: {
    beginner: [
      {
        title: 'Fat-Burn Brisk Walk & Core',
        category: 'Walking',
        intensity: 'Moderate',
        exercises: [
          { name: 'Brisk Incline Walk', detail: '20 min steady pace' },
          { name: 'Bodyweight Squats', detail: '3 x 12 reps' },
          { name: 'Forearm Plank', detail: '3 x 30 sec' },
        ],
        kcalPerMin: 6.5,
      },
      {
        title: 'Low-Impact Cardio Circuit',
        category: 'Cycling',
        intensity: 'Moderate',
        exercises: [
          { name: 'Stationary Cycling Intervals', detail: '15 min (1 min fast / 1 min easy)' },
          { name: 'Jumping Jacks / Step Jacks', detail: '3 x 30 sec' },
          { name: 'Glute Bridges', detail: '3 x 15 reps' },
        ],
        kcalPerMin: 7.5,
      },
    ],
    intermediate: [
      {
        title: 'HIIT Shred & Tempo Run',
        category: 'Running',
        intensity: 'High',
        exercises: [
          { name: 'Dynamic Warmup Jog', detail: '5 min' },
          { name: '30/30 Sprint Intervals', detail: '12 rounds' },
          { name: 'Burpees & Mountain Climbers', detail: '4 x 40 sec' },
        ],
        kcalPerMin: 11.2,
      },
      {
        title: 'Metabolic Full-Body Conditioning',
        category: 'Gym',
        intensity: 'High',
        exercises: [
          { name: 'Kettlebell Swings', detail: '4 x 15 reps' },
          { name: 'Goblet Squats', detail: '4 x 12 reps' },
          { name: 'Rowing Machine Sprint', detail: '10 min steady burn' },
        ],
        kcalPerMin: 9.8,
      },
    ],
    advanced: [
      {
        title: 'Athlete VO2 Max Torch',
        category: 'Running',
        intensity: 'High',
        exercises: [
          { name: 'Threshold Tempo Run', detail: '20 min @ 85% HR' },
          { name: 'Hill Sprints / Treadmill 8%', detail: '8 x 45 sec' },
          { name: 'Hanging Leg Raises', detail: '4 x 15 reps' },
        ],
        kcalPerMin: 13.0,
      },
    ],
  },
  muscle_gain: {
    beginner: [
      {
        title: 'Foundational Push-Pull Strength',
        category: 'Strength Training',
        intensity: 'Moderate',
        exercises: [
          { name: 'Goblet Squats', detail: '3 x 10 reps' },
          { name: 'Dumbbell Chest Press', detail: '3 x 10 reps' },
          { name: 'Lat Pulldown / Dumbbell Row', detail: '3 x 10 reps' },
        ],
        kcalPerMin: 6.2,
      },
    ],
    intermediate: [
      {
        title: 'Upper Body Hypertrophy Split',
        category: 'Strength Training',
        intensity: 'High',
        exercises: [
          { name: 'Barbell Bench Press', detail: '4 x 8-10 reps' },
          { name: 'Bent-Over Barbell Row', detail: '4 x 8-10 reps' },
          { name: 'Overhead Dumbbell Press', detail: '3 x 10 reps' },
          { name: 'Incline Bicep Curl & Tricep Pushdown', detail: '3 x 12 superset' },
        ],
        kcalPerMin: 7.4,
      },
      {
        title: 'Lower Body Power & Mass',
        category: 'Gym',
        intensity: 'High',
        exercises: [
          { name: 'Back Squats', detail: '4 x 6-8 reps' },
          { name: 'Romanian Deadlifts', detail: '4 x 8-10 reps' },
          { name: 'Walking Lunges', detail: '3 x 12 each leg' },
        ],
        kcalPerMin: 8.1,
      },
    ],
    advanced: [
      {
        title: 'Heavy Compound Overload',
        category: 'Strength Training',
        intensity: 'High',
        exercises: [
          { name: 'Deadlift', detail: '5 x 5 heavy reps' },
          { name: 'Weighted Pull-ups', detail: '4 x 8 reps' },
          { name: 'Incline Dumbbell Press', detail: '4 x 8 reps' },
        ],
        kcalPerMin: 8.6,
      },
    ],
  },
  endurance: {
    beginner: [
      {
        title: 'Zone 2 Aerobic Base Ride',
        category: 'Cycling',
        intensity: 'Moderate',
        exercises: [
          { name: 'Steady Zone 2 Cycling', detail: 'Conversational pace' },
          { name: 'Post-Ride Calf & Hip Mobility', detail: '5 min' },
        ],
        kcalPerMin: 7.2,
      },
    ],
    intermediate: [
      {
        title: 'Progressive Tempo Run',
        category: 'Running',
        intensity: 'High',
        exercises: [
          { name: 'Easy Warmup Mile', detail: '10 min' },
          { name: 'Negative-Split Tempo Run', detail: 'Build speed every 5 min' },
          { name: 'Cooldown Walk', detail: '5 min' },
        ],
        kcalPerMin: 10.5,
      },
    ],
    advanced: [
      {
        title: 'Pool & Track Endurance Engine',
        category: 'Swimming',
        intensity: 'High',
        exercises: [
          { name: 'Freestyle Distance Sets', detail: '8 x 100m @ 20s rest' },
          { name: 'Pull Buoy Technique Laps', detail: '400m steady' },
        ],
        kcalPerMin: 11.4,
      },
    ],
  },
  general_fitness: {
    beginner: [
      {
        title: 'Mobility Flow & Active Core',
        category: 'Yoga',
        intensity: 'Low',
        exercises: [
          { name: 'Sun Salutation Flow', detail: '10 min' },
          { name: 'Bird-Dogs & Dead Bugs', detail: '3 x 10 each side' },
          { name: 'Deep Stretch & Breathwork', detail: '5 min' },
        ],
        kcalPerMin: 4.5,
      },
    ],
    intermediate: [
      {
        title: 'Balanced Athletic Conditioning',
        category: 'Gym',
        intensity: 'Moderate',
        exercises: [
          { name: 'Rowing Warmup', detail: '8 min' },
          { name: 'Push-ups + Kettlebell Goblet Squats', detail: '4 x 12 superset' },
          { name: 'Plank Shoulder Taps', detail: '3 x 20 reps' },
        ],
        kcalPerMin: 8.0,
      },
    ],
    advanced: [
      {
        title: 'Hybrid Strength & Engine',
        category: 'Strength Training',
        intensity: 'High',
        exercises: [
          { name: 'Barbell Thrusters', detail: '4 x 10 reps' },
          { name: 'Pull-ups + Box Jumps', detail: '4 x 10 superset' },
          { name: 'Assault Bike / Sprint Finish', detail: '8 min intervals' },
        ],
        kcalPerMin: 10.2,
      },
    ],
  },
};

const DAILY_TIPS = [
  'Prioritize 30g of protein within 90 minutes post-workout to accelerate muscle repair and curb cravings.',
  'Drinking 500 ml of water right after waking up boosts alertness and helps hit your hydration target early.',
  'Consistency beats intensity: three 30-minute sessions every week outperform one exhausting two-hour session.',
  'Aim for 7-9 hours of sleep — poor sleep elevates cortisol and reduces fat-oxidation and strength recovery.',
  'Progressive overload does not always mean heavier weights: adding 1 rep or slowing your eccentric tempo works too.',
  'Keep 80% of your cardio in conversational Zone 2 to build mitochondrial endurance without burning out.',
];

/**
 * Generates smart workout recommendations tailored to goal, fitness level, and available minutes.
 */
const recommendWorkouts = ({ goal = 'general_fitness', fitnessLevel = 'intermediate', duration = 30 }) => {
  const goalBucket = WORKOUT_TEMPLATES[goal] || WORKOUT_TEMPLATES.general_fitness;
  const levelTemplates =
    goalBucket[fitnessLevel] || goalBucket.intermediate || Object.values(goalBucket)[0];
  const fallbackPool = WORKOUT_TEMPLATES.general_fitness[fitnessLevel] || [];

  const combined = [...levelTemplates, ...fallbackPool].slice(0, 3);
  const mins = Math.max(10, Math.min(120, Number(duration) || 30));

  return combined.map((tpl, idx) => ({
    id: `${goal}-${fitnessLevel}-${idx}`,
    title: tpl.title,
    category: tpl.category,
    intensity: tpl.intensity,
    duration: mins,
    estimatedCalories: Math.round(tpl.kcalPerMin * mins),
    exercises: tpl.exercises,
    fitReason: `Tailored for ${goal.replace('_', ' ')} at ${fitnessLevel} level (${mins} min window).`,
  }));
};

/**
 * Builds holistic AI insights and chat response using real user metrics and logs.
 */
const buildAiInsights = ({ user, recentWorkouts, todayNutrition, todayActivity, goals, streakInfo }) => {
  const { bmi, category: bmiCategory } = calculateBmi(user.weightKg, user.heightCm);
  const targets = user.dailyTargets || {};
  const todayCaloriesIn = todayNutrition.reduce((s, n) => s + (n.calories || 0), 0);
  const todayProtein = todayNutrition.reduce((s, n) => s + (n.protein || 0), 0);
  const todayWater = todayActivity?.waterMl || 0;
  const todaySteps = todayActivity?.steps || 0;

  const weekKeys = new Set(getPastDateKeys(7));
  const weeklyWorkouts = recentWorkouts.filter((w) => weekKeys.has(w.dateKey));
  const weeklyMinutes = weeklyWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
  const weeklyBurned = weeklyWorkouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);

  const recommendedNutrition = {
    calorieTarget:
      user.primaryGoal === 'weight_loss'
        ? Math.max(1500, (targets.caloriesIntake || 2200) - 300)
        : user.primaryGoal === 'muscle_gain'
          ? (targets.caloriesIntake || 2200) + 250
          : targets.caloriesIntake || 2200,
    proteinTargetG: Math.round((user.weightKg || 70) * (user.primaryGoal === 'muscle_gain' ? 2.0 : 1.6)),
    waterTargetMl: targets.waterMl || 2500,
    todayRemainingCalories: Math.max(0, (targets.caloriesIntake || 2200) - todayCaloriesIn),
    todayProteinGapG: Math.max(0, (targets.proteinG || 140) - todayProtein),
    advice:
      todayProtein < (targets.proteinG || 140) * 0.6
        ? `You've logged ${todayProtein}g protein so far today. Add a lean protein meal (e.g., Greek yogurt, chicken breast, lentils, or whey shake) to stay on track.`
        : `Great protein pacing today (${todayProtein}g logged)! Keep hydrated with ${Math.max(0, (targets.waterMl || 2500) - todayWater)} ml more water.`,
  };

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const dailyTip = DAILY_TIPS[dayOfYear % DAILY_TIPS.length];

  const recommendations = recommendWorkouts({
    goal: user.primaryGoal,
    fitnessLevel: user.fitnessLevel,
    duration: 35,
  });

  const goalGuidance =
    goals.length === 0
      ? 'Set at least one weekly workout target and daily step goal in Fitness Goals so FITNEX can track your milestones automatically.'
      : `You have ${goals.filter((g) => g.status === 'active').length} active goal(s). This week you completed ${weeklyWorkouts.length} workouts (${weeklyMinutes} mins, ${weeklyBurned} kcal burned).`;

  return {
    snapshot: {
      bmi,
      bmiCategory,
      weeklyWorkouts: weeklyWorkouts.length,
      weeklyMinutes,
      weeklyBurned,
      todaySteps,
      todayWater,
      todayCaloriesIn,
      todayProtein,
      workoutStreak: streakInfo.workoutStreak,
    },
    dailyTip,
    recommendedNutrition,
    workoutSuggestions: recommendations,
    goalGuidance,
  };
};

const answerAiPrompt = ({ prompt, insights, user }) => {
  const q = (prompt || '').toLowerCase();
  const { snapshot, recommendedNutrition, workoutSuggestions, dailyTip } = insights;
  const firstName = (user.name || 'Athlete').split(' ')[0];

  if (q.includes('diet') || q.includes('eat') || q.includes('meal') || q.includes('nutrition') || q.includes('protein') || q.includes('calorie')) {
    return (
      `Here is your personalized nutrition brief, ${firstName}:\n\n` +
      `• Goal: ${user.primaryGoal.replace('_', ' ')} | Recommended daily intake: ~${recommendedNutrition.calorieTarget} kcal\n` +
      `• Protein target: ${recommendedNutrition.proteinTargetG}g/day (logged today: ${snapshot.todayProtein}g)\n` +
      `• Calories logged today: ${snapshot.todayCaloriesIn} kcal (${recommendedNutrition.todayRemainingCalories} kcal remaining)\n` +
      `• Water intake: ${snapshot.todayWater} ml / ${recommendedNutrition.waterTargetMl} ml\n\n` +
      `Coach tip: ${recommendedNutrition.advice}`
    );
  }

  if (q.includes('workout') || q.includes('exercise') || q.includes('train') || q.includes('cardio') || q.includes('strength')) {
    const top = workoutSuggestions[0];
    const exList = top.exercises.map((e) => `- ${e.name} (${e.detail})`).join('\n');
    return (
      `Based on your ${user.fitnessLevel} level and ${user.primaryGoal.replace('_', ' ')} goal, try **${top.title}** (${top.duration} min, ~${top.estimatedCalories} kcal):\n\n` +
      `${exList}\n\n` +
      `You have logged ${snapshot.weeklyWorkouts} workout(s) (${snapshot.weeklyMinutes} min) this week with a ${snapshot.workoutStreak}-day streak!`
    );
  }

  if (q.includes('weight') || q.includes('bmi') || q.includes('fat') || q.includes('lose') || q.includes('gain')) {
    return (
      `Your current recorded stats show **${user.weightKg} kg** at **${user.heightCm} cm** (BMI **${snapshot.bmi}** — ${snapshot.bmiCategory}).\n\n` +
      `• For healthy sustainable progress toward ${user.primaryGoal.replace('_', ' ')}, aim for ~${recommendedNutrition.calorieTarget} kcal/day with ${recommendedNutrition.proteinTargetG}g protein.\n` +
      `• Pair 3–5 weekly workouts (${snapshot.weeklyMinutes} min logged this week) with 8,000–10,000 daily steps (today: ${snapshot.todaySteps.toLocaleString()} steps).`
    );
  }

  if (q.includes('water') || q.includes('hydrat') || q.includes('step') || q.includes('streak')) {
    return (
      `Today's live check-in for ${firstName}:\n` +
      `• Steps: ${snapshot.todaySteps.toLocaleString()} / ${(user.dailyTargets?.steps || 10000).toLocaleString()}\n` +
      `• Hydration: ${snapshot.todayWater} ml / ${recommendedNutrition.waterTargetMl} ml\n` +
      `• Current workout streak: ${snapshot.workoutStreak} day(s)\n\n` +
      `Tip: ${dailyTip}`
    );
  }

  return (
    `Hi ${firstName}! Here's your live FITNEX status:\n` +
    `• Weekly training: ${snapshot.weeklyWorkouts} workouts (${snapshot.weeklyMinutes} min, ${snapshot.weeklyBurned} kcal burned)\n` +
    `• Current streak: ${snapshot.workoutStreak} day(s) | Today's steps: ${snapshot.todaySteps.toLocaleString()}\n` +
    `• Nutrition today: ${snapshot.todayCaloriesIn} kcal, ${snapshot.todayProtein}g protein, ${snapshot.todayWater} ml water\n\n` +
    `Recommended next session: **${workoutSuggestions[0].title}** (~${workoutSuggestions[0].estimatedCalories} kcal).\n` +
    `Daily Tip: ${dailyTip}`
  );
};

module.exports = {
  recommendWorkouts,
  buildAiInsights,
  answerAiPrompt,
};
