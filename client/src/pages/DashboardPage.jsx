import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Plus,
  Route,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#12151b]/95 border border-white/12 px-3.5 py-2.5 shadow-xl text-xs">
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-zinc-300">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <strong className="text-white tabular-nums">{Number(entry.value).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { showToast, notifyBadges } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartWindow, setChartWindow] = useState('weekly'); // 'weekly' | 'monthly'
  const [stepsModalOpen, setStepsModalOpen] = useState(false);
  const [stepsInput, setStepsInput] = useState('');
  const [distanceInput, setDistanceInput] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleWaterAdjust = async (addWaterMl) => {
    try {
      const res = await api.put('/dashboard/activity', { addWaterMl });
      if (res.data.newlyEarned?.length) {
        notifyBadges(res.data.newlyEarned);
        refreshUser();
      } else {
        showToast(`Water intake updated (+${addWaterMl} ml)`, 'success');
      }
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveSteps = async (e) => {
    e.preventDefault();
    setSavingActivity(true);
    try {
      const payload = {
        steps: Number(stepsInput),
        ...(distanceInput !== '' && { distanceKm: Number(distanceInput) }),
      };
      const res = await api.put('/dashboard/activity', payload);
      if (res.data.newlyEarned?.length) {
        notifyBadges(res.data.newlyEarned);
        refreshUser();
      }
      showToast('Daily steps & distance updated!', 'success');
      setStepsModalOpen(false);
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingActivity(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading your live FITNEX telemetry..." />;
  if (error) {
    return (
      <div className="fitnex-card p-8 text-center space-y-3">
        <p className="text-rose-400 font-semibold">{error}</p>
        <button type="button" onClick={loadDashboard} className="px-4 py-2 rounded-xl neon-btn text-sm">
          Retry
        </button>
      </div>
    );
  }

  const { today, targets, dailyProgress, weeklySummary, monthlySummary, streaks, badges, recentWorkouts, goals } = data;
  const chartData = chartWindow === 'weekly' ? weeklySummary : monthlySummary;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#39ff14]">
            Performance Command Center
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
            Welcome back, {(user?.name || 'Athlete').split(' ')[0]}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track today’s movement, energy balance, hydration, and streak momentum.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setStepsInput(String(today.steps));
              setDistanceInput(String(today.distanceKm));
              setStepsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#161922] hover:bg-[#1e2330] border border-white/10 text-xs sm:text-sm font-semibold text-white flex items-center gap-2 transition-colors"
          >
            <Footprints className="w-4 h-4 text-[#39ff14]" />
            <span>Update Steps</span>
          </button>
          <Link
            to="/workouts"
            className="px-4 py-2.5 rounded-xl neon-btn text-xs sm:text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Log Workout</span>
          </Link>
        </div>
      </div>

      {/* Top 5 Core Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Daily Steps"
          value={today.steps.toLocaleString()}
          subtitle={`Goal: ${(targets.steps || 10000).toLocaleString()} (${dailyProgress.stepsPct}%)`}
          icon={Footprints}
          progress={dailyProgress.stepsPct}
          accent="neon"
        />
        <StatCard
          title="Calories Burned"
          value={`${today.caloriesBurned.toLocaleString()} kcal`}
          subtitle={`Workouts: ${today.workoutCalories} • Steps: ${today.stepCalories}`}
          icon={Flame}
          progress={dailyProgress.caloriesBurnPct}
          accent="amber"
        />
        <StatCard
          title="Distance Travelled"
          value={`${today.distanceKm} km`}
          subtitle={`From steps & cardio logs`}
          icon={Route}
          accent="sky"
        />
        <StatCard
          title="Active Workout Time"
          value={`${today.activeMinutes} min`}
          subtitle={`${today.workoutsCount} session(s) today`}
          icon={Clock}
          accent="purple"
        />
        <StatCard
          title="Daily Water Intake"
          value={`${today.waterMl.toLocaleString()} ml`}
          subtitle={`Target: ${(targets.waterMl || 2500).toLocaleString()} ml`}
          icon={Droplets}
          progress={dailyProgress.waterPct}
          accent="emerald"
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleWaterAdjust(250)}
                className="px-2 py-0.5 rounded-md bg-[#39ff14]/15 text-[#39ff14] hover:bg-[#39ff14]/25 font-bold transition-colors"
              >
                +250ml
              </button>
            </div>
          }
        />
      </div>

      {/* Daily Activity Progress & Streak Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Activity Rings / Progress */}
        <div className="fitnex-card p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#39ff14]" />
                Daily Activity Progress
              </h2>
              <p className="text-xs text-zinc-400">Live progress toward your daily targets</p>
            </div>
            <Link to="/nutrition" className="text-xs font-semibold text-[#39ff14] hover:underline">
              Log Meals & Water →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                label: 'Steps Target',
                current: today.steps.toLocaleString(),
                target: (targets.steps || 10000).toLocaleString(),
                pct: dailyProgress.stepsPct,
                color: 'bg-[#39ff14]',
              },
              {
                label: 'Active Calorie Burn',
                current: `${today.caloriesBurned} kcal`,
                target: `${targets.caloriesBurn || 550} kcal`,
                pct: dailyProgress.caloriesBurnPct,
                color: 'bg-amber-400',
              },
              {
                label: 'Hydration Level',
                current: `${today.waterMl} ml`,
                target: `${targets.waterMl || 2500} ml`,
                pct: dailyProgress.waterPct,
                color: 'bg-sky-400',
              },
              {
                label: 'Calorie Intake Budget',
                current: `${today.caloriesConsumed} kcal`,
                target: `${targets.caloriesIntake || 2200} kcal`,
                pct: dailyProgress.calorieIntakePct,
                color: 'bg-emerald-400',
              },
            ].map((bar) => (
              <div key={bar.label} className="p-4 rounded-xl bg-[#0e1015] border border-white/6 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">{bar.label}</span>
                  <span className="text-[#39ff14] font-bold tabular-nums">{bar.pct}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${bar.color}`}
                    style={{ width: `${Math.min(100, bar.pct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400 tabular-nums">
                  <span>{bar.current}</span>
                  <span>Target: {bar.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streaks & Badges Card */}
        <div className="fitnex-card p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                Streak & Badges
              </h2>
              <Link to="/goals" className="text-xs text-[#39ff14] hover:underline font-medium">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 rounded-xl bg-[#0e1015] border border-amber-400/20">
                <p className="text-[11px] uppercase tracking-wider text-zinc-400">Workout Streak</p>
                <p className="text-2xl font-extrabold text-amber-400 mt-1 tabular-nums">
                  {streaks.workoutStreak}d
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Best: {streaks.longestWorkoutStreak}d</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0e1015] border border-[#39ff14]/20">
                <p className="text-[11px] uppercase tracking-wider text-zinc-400">Active Streak</p>
                <p className="text-2xl font-extrabold text-[#39ff14] mt-1 tabular-nums">
                  {streaks.dailyActivityStreak}d
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Consistent days</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-2">Earned Badges ({badges.length})</p>
            {badges.length === 0 ? (
              <p className="text-xs text-zinc-500 p-3 rounded-xl bg-[#0e1015] border border-white/5">
                Log your first workout or hit 10k steps to unlock your first badge!
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {badges.slice(0, 4).map((b) => (
                  <span
                    key={b.key}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#39ff14]/10 border border-[#39ff14]/25 text-xs font-semibold text-[#b4ff8a]"
                  >
                    <Award className="w-3.5 h-3.5 text-[#39ff14]" />
                    {b.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/ai-coach"
            className="p-3 rounded-xl bg-gradient-to-r from-[#39ff14]/12 to-emerald-500/10 border border-[#39ff14]/25 flex items-center justify-between text-xs font-semibold text-white hover:border-[#39ff14]/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#39ff14]" />
              Ask AI Fitness Coach for today’s plan
            </span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Interactive Weekly / Monthly Performance Charts */}
      <div className="fitnex-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#39ff14]" />
              {chartWindow === 'weekly' ? 'Weekly Fitness Summary (Last 7 Days)' : 'Monthly Fitness Performance (Last 30 Days)'}
            </h2>
            <p className="text-xs text-zinc-400">
              Compare calories burned vs intake and daily step volume
            </p>
          </div>
          <div className="inline-flex p-1 rounded-xl bg-[#0e1015] border border-white/8 self-start">
            <button
              type="button"
              onClick={() => setChartWindow('weekly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartWindow === 'weekly' ? 'bg-[#39ff14] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Weekly (7D)
            </button>
            <button
              type="button"
              onClick={() => setChartWindow('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartWindow === 'monthly' ? 'bg-[#39ff14] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly (30D)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calories Burned vs Intake */}
          <div className="h-72 w-full">
            <p className="text-xs font-semibold text-zinc-400 mb-2">Calories Burned vs Intake (kcal)</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="caloriesBurned" name="Burned" fill="#39ff14" radius={[6, 6, 0, 0]} />
                <Bar dataKey="caloriesIntake" name="Intake" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Steps & Active Minutes Trend */}
          <div className="h-72 w-full">
            <p className="text-xs font-semibold text-zinc-400 mb-2">Daily Steps Volume</p>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#39ff14" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#39ff14" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="steps"
                  name="Steps"
                  stroke="#39ff14"
                  strokeWidth={2.5}
                  fill="url(#stepsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Workouts + Active Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="fitnex-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Dumbbell className="w-4.5 h-4.5 text-[#39ff14]" />
              Recent Workouts
            </h3>
            <Link to="/workouts" className="text-xs text-[#39ff14] hover:underline font-medium">
              Manage All →
            </Link>
          </div>
          {recentWorkouts.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">No workouts logged yet. Start today!</p>
          ) : (
            <div className="space-y-2.5">
              {recentWorkouts.map((w) => (
                <div
                  key={w._id}
                  className="p-3.5 rounded-xl bg-[#0e1015] border border-white/6 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{w.title}</p>
                    <p className="text-xs text-zinc-400">
                      {w.category} • {w.dateKey} • {w.intensity}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-bold text-[#39ff14]">{w.caloriesBurned} kcal</p>
                    <p className="text-xs text-zinc-400">{w.duration} min</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fitnex-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-4.5 h-4.5 text-[#39ff14]" />
              Active Fitness Goals
            </h3>
            <Link to="/goals" className="text-xs text-[#39ff14] hover:underline font-medium">
              Manage Goals →
            </Link>
          </div>
          {goals.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">No fitness goals created yet.</p>
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 4).map((g) => {
                let pct = 0;
                if (g.status === 'completed') pct = 100;
                else if (g.type === 'weight_loss') {
                  const span = Math.max(0.1, (g.startValue || g.currentValue) - g.targetValue);
                  const done = Math.max(0, (g.startValue || g.currentValue) - g.currentValue);
                  pct = Math.min(100, Math.round((done / span) * 100));
                } else {
                  pct = Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 1)) * 100));
                }
                return (
                  <div key={g._id} className="p-3.5 rounded-xl bg-[#0e1015] border border-white/6 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{g.title}</span>
                      <span className={g.status === 'completed' ? 'text-[#39ff14] font-bold' : 'text-zinc-300'}>
                        {g.currentValue} / {g.targetValue} {g.unit} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#39ff14] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Update Steps Modal */}
      <Modal
        open={stepsModalOpen}
        onClose={() => setStepsModalOpen(false)}
        title="Log Today’s Steps & Distance"
        subtitle="Updates your dashboard telemetry, calorie burn, and step goals immediately."
      >
        <form onSubmit={handleSaveSteps} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Today’s Steps</label>
            <input
              type="number"
              min="0"
              max="200000"
              className="fitnex-input"
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Distance (km) <span className="text-zinc-500">(optional — auto-estimated from steps if cleared)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="500"
              className="fitnex-input"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStepsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingActivity} className="px-5 py-2 rounded-xl neon-btn text-xs">
              {savingActivity ? 'Saving...' : 'Save Telemetry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
