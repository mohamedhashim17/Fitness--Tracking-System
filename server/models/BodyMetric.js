const mongoose = require('mongoose');

const bodyMetricSchema = new mongoose.Schema(
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
    },
    weightKg: { type: Number, required: true, min: 20, max: 400 },
    heightCm: { type: Number, required: true, min: 80, max: 260 },
    bmi: { type: Number, required: true },
    bmiCategory: { type: String, required: true },
    bodyFatPct: { type: Number, min: 2, max: 70 },
    chestCm: { type: Number, min: 30, max: 250 },
    waistCm: { type: Number, min: 30, max: 250 },
    hipsCm: { type: Number, min: 30, max: 250 },
    armsCm: { type: Number, min: 10, max: 100 },
    thighsCm: { type: Number, min: 20, max: 150 },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

bodyMetricSchema.index({ user: 1, dateKey: -1 });

module.exports = mongoose.model('BodyMetric', bodyMetricSchema);
