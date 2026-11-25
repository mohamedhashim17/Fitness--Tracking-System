const mongoose = require('mongoose');

const dailyActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    steps: { type: Number, default: 0, min: 0, max: 200000 },
    distanceKm: { type: Number, default: 0, min: 0, max: 500 },
    waterMl: { type: Number, default: 0, min: 0, max: 20000 },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

dailyActivitySchema.index({ user: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('DailyActivity', dailyActivitySchema);
