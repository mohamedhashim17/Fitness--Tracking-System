const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    age: { type: Number, min: 13, max: 120, default: 25 },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    heightCm: { type: Number, min: 80, max: 260, default: 172 },
    weightKg: { type: Number, min: 25, max: 350, default: 72 },
    fitnessLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    primaryGoal: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'endurance', 'general_fitness'],
      default: 'general_fitness',
    },
    dailyTargets: {
      steps: { type: Number, default: 10000 },
      caloriesBurn: { type: Number, default: 550 },
      caloriesIntake: { type: Number, default: 2200 },
      proteinG: { type: Number, default: 140 },
      carbsG: { type: Number, default: 240 },
      fatG: { type: Number, default: 70 },
      waterMl: { type: Number, default: 2500 },
      weeklyWorkouts: { type: Number, default: 4 },
    },
    badges: [
      {
        key: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, default: '' },
        earnedAt: { type: Date, default: Date.now },
      },
    ],
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
