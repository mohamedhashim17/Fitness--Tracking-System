import { useCallback, useEffect, useState } from 'react';
import { Award, CheckCircle2, Flame, Lock, Plus, Target, Trash2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

const GOAL_TYPES = [
  { value: 'daily_steps', label: 'Daily Step Target', unit: 'steps' },
  { value: 'weekly_workouts', label: 'Weekly Workout Target', unit: 'workouts' },
  { value: 'weight_loss', label: 'Weight Loss Goal', unit: 'kg' },
  { value: 'muscle_gain', label: 'Muscle Gain Goal', unit: 'kg' },
  { value: 'daily_calories', label: 'Daily Calorie Target', unit: 'kcal' },
  { value: 'daily_water', label: 'Water Drinking Target', unit: 'ml' },
];

export default function GoalsPage() {
  const { user, refreshUser } = useAuth();
  const { showToast, notifyBadges } = useToast();

  const [goals, setGoals] = useState([]);
  const [streaks, setStreaks] = useState({ workoutStreak: 0, longestWorkoutStreak: 0, dailyActivityStreak: 0 });
  const [badges, setBadges] = useState([]);
  const [badgeCatalog, setBadgeCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'daily_steps',
    targetValue: '10000',
    startValue: '',
    deadline: '',
  });
  const [saving, setSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    try {
      const { data } = await api.get('/goals');
      setGoals(data.goals || []);
      setStreaks(data.streaks || { workoutStreak: 0, longestWorkoutStreak: 0, dailyActivityStreak: 0 });
      setBadges(data.badges || []);
      setBadgeCatalog(data.badgeCatalog || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleTypeChange = (type) => {
    const defaults = {
      daily_steps: '10000',
      weekly_workouts: '5',
      weight_loss: String(Math.max(45, (user?.weightKg || 72) - 4)),
      muscle_gain: String((user?.weightKg || 72) + 4),
      daily_calories: '2200',
      daily_water: '3000',
    };
    setForm((prev) => ({
      ...prev,
      type,
      targetValue: defaults[type] || '100',
      startValue: type === 'weight_loss' || type === 'muscle_gain' ? String(user?.weightKg || 72) : '0',
    }));
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 2) {
      showToast('Goal title must be at least 2 characters.', 'error');
      return;
    }
    setSaving(true);
    try {
      const meta = GOAL_TYPES.find((t) => t.value === form.type);
      const { data } = await api.post('/goals', {
        title: form.title,
        type: form.type,
        targetValue: Number(form.targetValue),
        ...(form.startValue !== '' && { startValue: Number(form.startValue) }),
        unit: meta?.unit || 'units',
        ...(form.deadline && { deadline: form.deadline }),
      });
      showToast('Fitness goal created!', 'success');
      if (data.newlyEarned?.length) {
        notifyBadges(data.newlyEarned);
        refreshUser();
      }
      setModalOpen(false);
      setForm({ title: '', type: 'daily_steps', targetValue: '10000', startValue: '', deadline: '' });
      loadGoals();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      showToast('Goal deleted.', 'info');
      setGoals((prev) => prev.filter((g) => g._id !== id));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const computePct = (g) => {
    if (g.status === 'completed') return 100;
    if (g.type === 'weight_loss') {
      const span = Math.max(0.1, (g.startValue || g.currentValue) - g.targetValue);
      const done = Math.max(0, (g.startValue || g.currentValue) - g.currentValue);
      return Math.min(100, Math.round((done / span) * 100));
    }
    return Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 1)) * 100));
  };

  if (loading) return <LoadingSpinner label="Syncing goals & streaks..." />;

  const earnedSet = new Set(badges.map((b) => b.key));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Fitness Goals & Streaks</h1>
          <p className="text-sm text-zinc-400">
            Targets sync dynamically with your workouts, steps, hydration, and weight entries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl neon-btn text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Streak Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="fitnex-card p-5 border-amber-400/25 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-400/15 text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Workout Streak</p>
            <p className="text-2xl font-extrabold text-white tabular-nums">{streaks.workoutStreak} Days</p>
          </div>
        </div>
        <div className="fitnex-card p-5 border-[#39ff14]/25 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#39ff14]/15 text-[#39ff14]">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Best Workout Streak</p>
            <p className="text-2xl font-extrabold text-white tabular-nums">{streaks.longestWorkoutStreak} Days</p>
          </div>
        </div>
        <div className="fitnex-card p-5 border-sky-400/25 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-400/15 text-sky-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Daily Activity Streak</p>
            <p className="text-2xl font-extrabold text-white tabular-nums">{streaks.dailyActivityStreak} Days</p>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="fitnex-card p-10 text-center space-y-2">
          <Target className="w-9 h-9 text-zinc-600 mx-auto" />
          <p className="text-white font-semibold">No goals yet</p>
          <p className="text-xs text-zinc-400">Create a step, workout, weight, calorie, or water goal to track progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const pct = computePct(g);
            const isDone = g.status === 'completed';
            return (
              <div
                key={g._id}
                className={`fitnex-card p-5 space-y-3 ${isDone ? 'border-[#39ff14]/45' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-white/5 text-[11px] font-semibold text-zinc-300 capitalize">
                        {g.type.replace('_', ' ')}
                      </span>
                      {isDone && (
                        <span className="px-2.5 py-0.5 rounded-md bg-[#39ff14]/15 text-[#39ff14] text-[11px] font-bold">
                          Achieved!
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mt-2">{g.title}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(g._id)}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/15"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs tabular-nums">
                    <span className="text-zinc-300">
                      Current: <strong className="text-white">{g.currentValue} {g.unit}</strong>
                    </span>
                    <span className="text-[#39ff14] font-bold">
                      Target: {g.targetValue} {g.unit} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#39ff14] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {g.deadline && (
                  <p className="text-[11px] text-zinc-500">
                    Deadline: {new Date(g.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Achievement Badges Catalog */}
      <div className="fitnex-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Achievement Badges ({badges.length} / {badgeCatalog.length})
          </h2>
          <p className="text-xs text-zinc-400">Unlock badges automatically through workouts, streaks, hydration, and goals.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {badgeCatalog.map((b) => {
            const unlocked = earnedSet.has(b.key);
            return (
              <div
                key={b.key}
                className={`p-4 rounded-xl border transition-all ${
                  unlocked
                    ? 'bg-gradient-to-br from-[#39ff14]/12 to-[#12151b] border-[#39ff14]/35'
                    : 'bg-[#0e1015] border-white/6 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {unlocked ? (
                    <Award className="w-5 h-5 text-[#39ff14]" />
                  ) : (
                    <Lock className="w-4 h-4 text-zinc-500" />
                  )}
                  <span className="text-[11px] font-bold text-amber-400">+{b.points} pts</span>
                </div>
                <p className="text-sm font-bold text-white">{b.name}</p>
                <p className="text-xs text-zinc-400 mt-1">{b.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Goal Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Personalized Goal"
        subtitle="Track automatic progress against your daily and weekly telemetry."
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Goal Category</label>
            <select
              className="fitnex-input"
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {GOAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Goal Title</label>
            <input
              type="text"
              className="fitnex-input"
              placeholder="e.g., Lose 4 kg before summer"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Target ({GOAL_TYPES.find((t) => t.value === form.type)?.unit})
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                className="fitnex-input"
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Deadline (optional)</label>
              <input
                type="date"
                className="fitnex-input"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl neon-btn text-xs">
              {saving ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
