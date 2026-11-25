const mongoose = require('mongoose');

const WORKOUT_CATEGORIES = [
  'Running',
  'Walking',
  'Cycling',
  'Gym',
  'Yoga',
  'Swimming',
  'Strength Training',
];

const workoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Workout title is required'],
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      enum: WORKOUT_CATEGORIES,
      required: [true, 'Workout category is required'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: 1,
      max: 600,
    },
    caloriesBurned: {
      type: Number,
      required: [true, 'Calories burned is required'],
      min: 0,
      max: 5000,
    },
    distanceKm: {
      type: Number,
      min: 0,
      max: 500,
      default: 0,
    },
    intensity: {
      type: String,
      enum: ['Low', 'Moderate', 'High'],
      default: 'Moderate',
    },
    sets: { type: Number, min: 0, max: 100, default: 0 },
    reps: { type: Number, min: 0, max: 1000, default: 0 },
    weightLiftedKg: { type: Number, min: 0, max: 1000, default: 0 },
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
);

workoutSchema.index({ user: 1, dateKey: -1 });

module.exports = mongoose.model('Workout', workoutSchema);
module.exports.WORKOUT_CATEGORIES = WORKOUT_CATEGORIES;
