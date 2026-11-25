const mongoose = require('mongoose');

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

const nutritionLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    mealType: {
      type: String,
      enum: MEAL_TYPES,
      required: true,
    },
    foodName: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      maxlength: 120,
    },
    servingSize: {
      type: String,
      trim: true,
      default: '1 serving',
    },
    calories: { type: Number, required: true, min: 0, max: 10000 },
    protein: { type: Number, default: 0, min: 0, max: 1000 },
    carbs: { type: Number, default: 0, min: 0, max: 1000 },
    fat: { type: Number, default: 0, min: 0, max: 1000 },
  },
  { timestamps: true }
);

nutritionLogSchema.index({ user: 1, dateKey: -1 });

module.exports = mongoose.model('NutritionLog', nutritionLogSchema);
module.exports.MEAL_TYPES = MEAL_TYPES;
