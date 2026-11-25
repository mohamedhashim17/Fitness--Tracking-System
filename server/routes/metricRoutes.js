const express = require('express');
const { body, param } = require('express-validator');
const BodyMetric = require('../models/BodyMetric');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/errorMiddleware');
const { toDateKey, calculateBmi, formatShortDate } = require('../utils/dateUtils');
const { syncUserGoals } = require('../utils/goalSync');

const router = express.Router();

// GET /api/metrics
router.get('/', protect, async (req, res, next) => {
  try {
    const metrics = await BodyMetric.find({ user: req.user._id }).sort({ dateKey: 1, createdAt: 1 }).lean();
    const latest = metrics[metrics.length - 1] || null;
    const first = metrics[0] || null;

    const weightDelta =
      latest && first ? Number((latest.weightKg - first.weightKg).toFixed(1)) : 0;

    const chartData = metrics.map((m) => ({
      dateKey: m.dateKey,
      label: formatShortDate(m.dateKey),
      weightKg: m.weightKg,
      bmi: m.bmi,
      bodyFatPct: m.bodyFatPct ?? null,
      waistCm: m.waistCm ?? null,
    }));

    res.json({
      metrics: [...metrics].reverse(),
      chartData,
      summary: {
        currentWeightKg: latest?.weightKg ?? req.user.weightKg,
        heightCm: latest?.heightCm ?? req.user.heightCm,
        bmi: latest?.bmi ?? calculateBmi(req.user.weightKg, req.user.heightCm).bmi,
        bmiCategory: latest?.bmiCategory ?? calculateBmi(req.user.weightKg, req.user.heightCm).category,
        weightDelta,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/metrics
router.post(
  '/',
  protect,
  [
    body('weightKg').isFloat({ min: 20, max: 400 }).withMessage('Weight must be 20-400 kg.'),
    body('heightCm').optional().isFloat({ min: 80, max: 260 }).withMessage('Height must be 80-260 cm.'),
    body('dateKey').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const weightKg = Number(req.body.weightKg);
      const heightCm = Number(req.body.heightCm || req.user.heightCm || 170);
      const { bmi, category } = calculateBmi(weightKg, heightCm);

      const metric = await BodyMetric.create({
        user: req.user._id,
        dateKey: req.body.dateKey || toDateKey(),
        weightKg,
        heightCm,
        bmi,
        bmiCategory: category,
        bodyFatPct: req.body.bodyFatPct ? Number(req.body.bodyFatPct) : undefined,
        chestCm: req.body.chestCm ? Number(req.body.chestCm) : undefined,
        waistCm: req.body.waistCm ? Number(req.body.waistCm) : undefined,
        hipsCm: req.body.hipsCm ? Number(req.body.hipsCm) : undefined,
        armsCm: req.body.armsCm ? Number(req.body.armsCm) : undefined,
        thighsCm: req.body.thighsCm ? Number(req.body.thighsCm) : undefined,
        notes: req.body.notes || '',
      });

      await User.findByIdAndUpdate(req.user._id, { weightKg, heightCm });
      await syncUserGoals(req.user._id);

      res.status(201).json({ metric });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/metrics/:id
router.delete(
  '/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid metric ID.')],
  validateRequest,
  async (req, res, next) => {
    try {
      const deleted = await BodyMetric.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!deleted) return res.status(404).json({ message: 'Measurement record not found.' });
      res.json({ message: 'Measurement deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
