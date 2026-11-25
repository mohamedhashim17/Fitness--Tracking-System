const express = require('express');
const { body, param } = require('express-validator');
const NutritionLog = require('../models/NutritionLog');
const { MEAL_TYPES } = require('../models/NutritionLog');
const DailyActivity = require('../models/DailyActivity');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/errorMiddleware');
const { toDateKey, getPastDateKeys, formatShortDate } = require('../utils/dateUtils');
const { syncUserGoals } = require('../utils/goalSync');
const { syncUserAchievements } = require('../utils/streakUtils');

const router = express.Router();

const FOOD_LIBRARY = [
  { name: 'Grilled Chicken Breast (150g)', servingSize: '150g', calories: 248, protein: 46, carbs: 0, fat: 5 },
  { name: 'Rolled Oats with Milk & Berries', servingSize: '1 bowl', calories: 380, protein: 16, carbs: 62, fat: 8 },
  { name: 'Whole Eggs (2 Large)', servingSize: '2 eggs', calories: 144, protein: 13, carbs: 1, fat: 10 },
  { name: 'Greek Yogurt (Plain, 200g)', servingSize: '200g', calories: 146, protein: 20, carbs: 8, fat: 4 },
  { name: 'Atlantic Salmon Fillet (180g)', servingSize: '180g', calories: 370, protein: 39, carbs: 0, fat: 22 },
  { name: 'Brown Rice Cooked (1 cup)', servingSize: '195g', calories: 216, protein: 5, carbs: 45, fat: 2 },
  { name: 'Quinoa Cooked (1 cup)', servingSize: '185g', calories: 222, protein: 8, carbs: 39, fat: 4 },
  { name: 'Sweet Potato Baked (1 medium)', servingSize: '150g', calories: 135, protein: 3, carbs: 31, fat: 0 },
  { name: 'Whey Protein Shake (1 scoop)', servingSize: '32g', calories: 125, protein: 25, carbs: 3, fat: 2 },
  { name: 'Avocado (Half)', servingSize: '100g', calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Banana (1 Medium)', servingSize: '118g', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Almonds (28g handful)', servingSize: '28g', calories: 164, protein: 6, carbs: 6, fat: 14 },
  { name: 'Paneer / Cottage Cheese (150g)', servingSize: '150g', calories: 265, protein: 22, carbs: 6, fat: 17 },
  { name: 'Lentil Dal Cooked (1 cup)', servingSize: '200g', calories: 230, protein: 18, carbs: 40, fat: 1 },
  { name: 'Peanut Butter (2 tbsp)', servingSize: '32g', calories: 188, protein: 8, carbs: 6, fat: 16 },
  { name: 'Steamed Broccoli & Greens', servingSize: '150g', calories: 52, protein: 4, carbs: 10, fat: 0 },
];

// GET /api/nutrition/foods
router.get('/foods', protect, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const foods = q
    ? FOOD_LIBRARY.filter((f) => f.name.toLowerCase().includes(q))
    : FOOD_LIBRARY;
  res.json({ foods });
});

// GET /api/nutrition?date=YYYY-MM-DD
router.get('/', protect, async (req, res, next) => {
  try {
    const dateKey = req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : toDateKey();
    const weekKeys = getPastDateKeys(7);

    const [logs, activity, weekLogs] = await Promise.all([
      NutritionLog.find({ user: req.user._id, dateKey }).sort({ createdAt: -1 }).lean(),
      DailyActivity.findOne({ user: req.user._id, dateKey }).lean(),
      NutritionLog.find({ user: req.user._id, dateKey: { $in: weekKeys } }).lean(),
    ]);

    const totals = logs.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fat: acc.fat + (item.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const weeklyCalories = weekKeys.map((k) => {
      const dayItems = weekLogs.filter((l) => l.dateKey === k);
      return {
        dateKey: k,
        label: formatShortDate(k),
        calories: dayItems.reduce((s, i) => s + (i.calories || 0), 0),
        protein: dayItems.reduce((s, i) => s + (i.protein || 0), 0),
      };
    });

    res.json({
      dateKey,
      logs,
      totals,
      waterMl: activity?.waterMl || 0,
      targets: req.user.dailyTargets,
      weeklyCalories,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/nutrition
router.post(
  '/',
  protect,
  [
    body('mealType').isIn(MEAL_TYPES).withMessage('Meal type must be Breakfast, Lunch, Dinner, or Snacks.'),
    body('foodName').trim().isLength({ min: 1, max: 120 }).withMessage('Food name is required.'),
    body('calories').isFloat({ min: 0, max: 10000 }).withMessage('Calories must be 0-10,000.'),
    body('protein').optional().isFloat({ min: 0, max: 1000 }),
    body('carbs').optional().isFloat({ min: 0, max: 1000 }),
    body('fat').optional().isFloat({ min: 0, max: 1000 }),
    body('dateKey').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const entry = await NutritionLog.create({
        user: req.user._id,
        dateKey: req.body.dateKey || toDateKey(),
        mealType: req.body.mealType,
        foodName: req.body.foodName,
        servingSize: req.body.servingSize || '1 serving',
        calories: Math.round(Number(req.body.calories)),
        protein: Math.round(Number(req.body.protein || 0)),
        carbs: Math.round(Number(req.body.carbs || 0)),
        fat: Math.round(Number(req.body.fat || 0)),
      });

      await syncUserGoals(req.user._id);
      res.status(201).json({ entry });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/nutrition/water
router.put(
  '/water',
  protect,
  [
    body('dateKey').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    body('waterMl').optional().isInt({ min: 0, max: 20000 }),
    body('addWaterMl').optional().isInt({ min: -5000, max: 5000 }),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const dateKey = req.body.dateKey || toDateKey();
      let doc = await DailyActivity.findOne({ user: req.user._id, dateKey });
      if (!doc) doc = new DailyActivity({ user: req.user._id, dateKey });

      if (req.body.waterMl !== undefined) {
        doc.waterMl = Number(req.body.waterMl);
      }
      if (req.body.addWaterMl !== undefined) {
        doc.waterMl = Math.max(0, (doc.waterMl || 0) + Number(req.body.addWaterMl));
      }

      await doc.save();
      await syncUserGoals(req.user._id);
      const { newlyEarned } = await syncUserAchievements(req.user._id);

      res.json({ waterMl: doc.waterMl, newlyEarned });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/nutrition/:id
router.put(
  '/:id',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid meal ID.'),
    body('mealType').optional().isIn(MEAL_TYPES),
    body('foodName').optional().trim().isLength({ min: 1, max: 120 }),
    body('calories').optional().isFloat({ min: 0, max: 10000 }),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const entry = await NutritionLog.findOne({ _id: req.params.id, user: req.user._id });
      if (!entry) return res.status(404).json({ message: 'Meal entry not found.' });

      const fields = ['mealType', 'foodName', 'servingSize', 'calories', 'protein', 'carbs', 'fat', 'dateKey'];
      for (const f of fields) {
        if (req.body[f] !== undefined) entry[f] = req.body[f];
      }
      await entry.save();
      await syncUserGoals(req.user._id);
      res.json({ entry });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/nutrition/:id
router.delete(
  '/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid meal ID.')],
  validateRequest,
  async (req, res, next) => {
    try {
      const entry = await NutritionLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!entry) return res.status(404).json({ message: 'Meal entry not found.' });
      await syncUserGoals(req.user._id);
      res.json({ message: 'Meal entry deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
