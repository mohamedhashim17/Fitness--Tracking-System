import { useState } from 'react';
import { Save, ShieldCheck, UserCircle2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: user?.name || '',
    age: String(user?.age || 25),
    gender: user?.gender || 'prefer_not_to_say',
    heightCm: String(user?.heightCm || 172),
    weightKg: String(user?.weightKg || 72),
    fitnessLevel: user?.fitnessLevel || 'intermediate',
    primaryGoal: user?.primaryGoal || 'general_fitness',
    steps: String(user?.dailyTargets?.steps || 10000),
    caloriesBurn: String(user?.dailyTargets?.caloriesBurn || 550),
    caloriesIntake: String(user?.dailyTargets?.caloriesIntake || 2200),
    proteinG: String(user?.dailyTargets?.proteinG || 140),
    carbsG: String(user?.dailyTargets?.carbsG || 240),
    fatG: String(user?.dailyTargets?.fatG || 70),
    waterMl: String(user?.dailyTargets?.waterMl || 2500),
    weeklyWorkouts: String(user?.dailyTargets?.weeklyWorkouts || 4),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        fitnessLevel: form.fitnessLevel,
        primaryGoal: form.primaryGoal,
        dailyTargets: {
          steps: Number(form.steps),
          caloriesBurn: Number(form.caloriesBurn),
          caloriesIntake: Number(form.caloriesIntake),
          proteinG: Number(form.proteinG),
          carbsG: Number(form.carbsG),
          fatG: Number(form.fatG),
          waterMl: Number(form.waterMl),
          weeklyWorkouts: Number(form.weeklyWorkouts),
        },
      });
      setUser(data.user);
      showToast('Profile and daily targets saved!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <UserCircle2 className="w-7 h-7 text-[#39ff14]" />
          Profile & Daily Targets
        </h1>
        <p className="text-sm text-zinc-400">
          Manage your athlete profile, fitness level, and personalized daily target thresholds.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="fitnex-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <h2 className="text-base font-bold text-white">Personal Information</h2>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-[#39ff14]" />
              {user?.email}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                className="fitnex-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Gender</label>
              <select
                className="fitnex-input"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Age</label>
              <input
                type="number"
                min="13"
                max="120"
                className="fitnex-input"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Height (cm)</label>
              <input
                type="number"
                min="80"
                max="260"
                className="fitnex-input"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="25"
                max="350"
                className="fitnex-input"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Fitness Level</label>
              <select
                className="fitnex-input"
                value={form.fitnessLevel}
                onChange={(e) => setForm({ ...form, fitnessLevel: e.target.value })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Primary Fitness Goal</label>
              <select
                className="fitnex-input"
                value={form.primaryGoal}
                onChange={(e) => setForm({ ...form, primaryGoal: e.target.value })}
              >
                <option value="general_fitness">General Fitness</option>
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="endurance">Endurance</option>
              </select>
            </div>
          </div>
        </div>

        <div className="fitnex-card p-6 space-y-4">
          <h2 className="text-base font-bold text-white border-b border-white/8 pb-3">Daily Nutrition & Activity Targets</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Daily Steps</label>
              <input
                type="number"
                className="fitnex-input"
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Burn Target (kcal)</label>
              <input
                type="number"
                className="fitnex-input"
                value={form.caloriesBurn}
                onChange={(e) => setForm({ ...form, caloriesBurn: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Calorie Intake</label>
              <input
                type="number"
                className="fitnex-input"
                value={form.caloriesIntake}
                onChange={(e) => setForm({ ...form, caloriesIntake: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Water (ml)</label>
              <input
                type="number"
                className="fitnex-input"
                value={form.waterMl}
                onChange={(e) => setForm({ ...form, waterMl: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Protein (g)</label>
              <input
                type="number"
                className="fitnex-input"
                value={form.proteinG}
                onChange={(e) => setForm({ ...form, proteinG: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Carbs (g)</label>
              <input
                type="number"
                className="fitnex-input"
                value={form.carbsG}
                onChange={(e) => setForm({ ...form, carbsG: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Fat (g)</label>
              <input
                type="number"
                className="fitnex-input"
                value={form.fatG}
                onChange={(e) => setForm({ ...form, fatG: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Weekly Workouts</label>
              <input
                type="number"
                className="fitnex-input"
                value={form.weeklyWorkouts}
                onChange={(e) => setForm({ ...form, weeklyWorkouts: e.target.value })}
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl neon-btn text-sm flex items-center gap-2">
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Profile...' : 'Save Profile & Targets'}</span>
        </button>
      </form>
    </div>
  );
}
