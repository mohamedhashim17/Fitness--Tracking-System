const mongoose = require('mongoose');

const GOAL_TYPES = [
  'daily_steps',
  'weekly_workouts',
  'weight_loss',
  'muscle_gain',
  'daily_calories',
  'daily_water',
];

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: GOAL_TYPES,
      required: true,
    },
    startValue: { type: Number, default: 0 },
    targetValue: { type: Number, required: true, min: 1 },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, default: 'units', trim: true },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Goal', goalSchema);
module.exports.GOAL_TYPES = GOAL_TYPES;
