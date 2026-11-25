const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const BodyMetric = require('../models/BodyMetric');
const Goal = require('../models/Goal');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/errorMiddleware');
const { toDateKey, calculateBmi } = require('../utils/dateUtils');

const router = express.Router();

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  age: user.age,
  gender: user.gender,
  heightCm: user.heightCm,
  weightKg: user.weightKg,
  fitnessLevel: user.fitnessLevel,
  primaryGoal: user.primaryGoal,
  dailyTargets: user.dailyTargets,
  badges: user.badges || [],
  createdAt: user.createdAt,
});

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters.'),
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('age').optional().isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120.'),
    body('heightCm').optional().isFloat({ min: 80, max: 260 }).withMessage('Height must be 80-260 cm.'),
    body('weightKg').optional().isFloat({ min: 25, max: 350 }).withMessage('Weight must be 25-350 kg.'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { name, email, password, age, gender, heightCm, weightKg, fitnessLevel, primaryGoal } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }

      const user = await User.create({
        name,
        email,
        password,
        ...(age && { age: Number(age) }),
        ...(gender && { gender }),
        ...(heightCm && { heightCm: Number(heightCm) }),
        ...(weightKg && { weightKg: Number(weightKg) }),
        ...(fitnessLevel && { fitnessLevel }),
        ...(primaryGoal && { primaryGoal }),
      });

      // Seed baseline body metric & starter goals for a personalized experience
      const { bmi, category } = calculateBmi(user.weightKg, user.heightCm);
      await BodyMetric.create({
        user: user._id,
        dateKey: toDateKey(),
        weightKg: user.weightKg,
        heightCm: user.heightCm,
        bmi,
        bmiCategory: category,
        notes: 'Initial baseline measurement',
      });

      await Goal.insertMany([
        {
          user: user._id,
          title: 'Daily 10,000 Steps',
          type: 'daily_steps',
          startValue: 0,
          targetValue: user.dailyTargets.steps,
          currentValue: 0,
          unit: 'steps',
        },
        {
          user: user._id,
          title: 'Weekly Workout Consistency',
          type: 'weekly_workouts',
          startValue: 0,
          targetValue: user.dailyTargets.weeklyWorkouts,
          currentValue: 0,
          unit: 'workouts',
        },
        {
          user: user._id,
          title: 'Daily Hydration Target',
          type: 'daily_water',
          startValue: 0,
          targetValue: user.dailyTargets.waterMl,
          currentValue: 0,
          unit: 'ml',
        },
      ]);

      await Notification.create({
        user: user._id,
        title: 'Welcome to FITNEX!',
        message: 'Your account and starter goals are ready. Log your first workout or meal to build your streak.',
        type: 'reminder',
      });

      const token = signToken(user._id);
      res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = signToken(user._id);
      res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address.')],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');

      if (!user) {
        return res.json({
          message: 'If that email exists in our system, a password reset code has been generated.',
        });
      }

      const resetCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      user.resetPasswordToken = crypto.createHash('sha256').update(resetCode).digest('hex');
      user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      res.json({
        message: 'Password reset code generated. Use it within 15 minutes to set a new password.',
        // Returned in non-production environments so the full flow can be verified without an SMTP server
        ...(process.env.NODE_ENV !== 'production' && { devResetCode: resetCode }),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('resetCode').trim().notEmpty().withMessage('Reset code is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, resetCode, newPassword } = req.body;
      const hashed = crypto.createHash('sha256').update(resetCode.trim().toUpperCase()).digest('hex');

      const user = await User.findOne({
        email,
        resetPasswordToken: hashed,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+resetPasswordToken +resetPasswordExpires +password');

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset code.' });
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ message: 'Password updated successfully. You can now log in with your new password.' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, async (req, res, next) => {
  try {
    const unreadNotifications = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });
    res.json({ user: sanitizeUser(req.user), unreadNotifications });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile
router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 chars.'),
    body('age').optional().isInt({ min: 13, max: 120 }).withMessage('Invalid age.'),
    body('heightCm').optional().isFloat({ min: 80, max: 260 }).withMessage('Invalid height.'),
    body('weightKg').optional().isFloat({ min: 25, max: 350 }).withMessage('Invalid weight.'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      const allowed = ['name', 'age', 'gender', 'heightCm', 'weightKg', 'fitnessLevel', 'primaryGoal'];
      for (const field of allowed) {
        if (req.body[field] !== undefined) user[field] = req.body[field];
      }

      if (req.body.dailyTargets && typeof req.body.dailyTargets === 'object') {
        user.dailyTargets = {
          ...user.dailyTargets.toObject(),
          ...req.body.dailyTargets,
        };
      }

      await user.save();
      res.json({ user: sanitizeUser(user), message: 'Profile updated successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/notifications
router.get('/notifications', protect, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/notifications/read-all
router.put('/notifications/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
