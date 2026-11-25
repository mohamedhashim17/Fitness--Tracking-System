import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, Flame, Printer, Target, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

const PIE_COLORS = ['#39ff14', '#38bdf8', '#f59e0b', '#a855f7', '#fb7185', '#2dd4bf', '#eab308'];

export default function AnalyticsPage() {
  const { showToast } = useToast();
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/analytics', { params: { range } });
      setData(res);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [range, showToast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleDownloadCsv = async () => {
    try {
      const response = await api.get('/analytics/export', {
        params: { format: 'csv', range },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitnex-report-${range}d.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Fitness report downloaded (CSV)!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading || !data) return <LoadingSpinner label="Crunching analytics & reports..." />;

  const { summary, dailySeries, weeklySeries, categoryBreakdown, weightProgress, goalCompletion } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Analytics & Reports</h1>
          <p className="text-sm text-zinc-400">
            Daily activity, weekly workouts, monthly performance, energy comparison, and downloadable reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <div className="inline-flex p-1 rounded-xl bg-[#13161d] border border-white/10">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRange(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  range === d ? 'bg-[#39ff14] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-4 py-2 rounded-xl neon-btn text-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-[#161922] border border-white/10 text-xs font-semibold text-white hover:border-[#39ff14]/40 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`Total Workouts (${range}D)`}
          value={summary.totalWorkouts}
          subtitle={`${summary.totalWorkoutMinutes} active min • Weekly: ${summary.weeklyWorkouts}`}
          icon={BarChart3}
          accent="neon"
        />
        <StatCard
          title={`Calories Burned (${range}D)`}
          value={`${summary.totalCaloriesBurned.toLocaleString()} kcal`}
          subtitle={`Weekly burn: ${summary.weeklyCaloriesBurned.toLocaleString()} kcal`}
          icon={Flame}
          accent="amber"
        />
        <StatCard
          title="Avg Daily Steps"
          value={summary.avgDailySteps.toLocaleString()}
          subtitle={`Total: ${summary.totalSteps.toLocaleString()} steps`}
          icon={TrendingUp}
          accent="sky"
        />
        <StatCard
          title="Goal Completion"
          value={`${summary.avgGoalCompletionPct}%`}
          subtitle={`${goalCompletion.filter((g) => g.status === 'completed').length} / ${goalCompletion.length} goals achieved`}
          icon={Target}
          progress={summary.avgGoalCompletionPct}
          accent="emerald"
        />
      </div>

      {/* Calories Burned vs Intake Comparison + Weekly Workout Minutes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="fitnex-card p-6 space-y-3">
          <h2 className="text-base font-bold text-white">Calories Burned vs Intake Comparison</h2>
          <p className="text-xs text-zinc-400">Energy expenditure vs nutrition intake over {range} days</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12151b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="caloriesBurned" name="Burned (kcal)" fill="#39ff14" radius={[4, 4, 0, 0]} />
                <Bar dataKey="caloriesIntake" name="Intake (kcal)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fitnex-card p-6 space-y-3">
          <h2 className="text-base font-bold text-white">Weekly Workout Report (Minutes & Steps)</h2>
          <p className="text-xs text-zinc-400">Past 7 days training duration</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12151b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="workoutMinutes" name="Workout Min" stroke="#39ff14" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="workoutCalories" name="Workout kcal" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Workout Category Breakdown & Weight Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="fitnex-card p-6 space-y-3">
          <h2 className="text-base font-bold text-white">Workout Discipline Breakdown</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-zinc-500 py-10 text-center">No workouts in this date range.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="minutes"
                      nameKey="category"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryBreakdown.map((entry, idx) => (
                        <Cell key={entry.category} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#12151b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-xs">
                {categoryBreakdown.map((c, idx) => (
                  <div key={c.category} className="flex items-center justify-between p-2 rounded-lg bg-[#0e1015]">
                    <span className="flex items-center gap-2 text-zinc-200">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      {c.category}
                    </span>
                    <span className="text-zinc-400 tabular-nums">
                      {c.sessions}x • {c.minutes}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="fitnex-card p-6 space-y-3">
          <h2 className="text-base font-bold text-white">Weight Progress Visualization</h2>
          {weightProgress.length === 0 ? (
            <p className="text-sm text-zinc-500 py-10 text-center">Log body metrics to track weight trends.</p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12151b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                  />
                  <Line type="monotone" dataKey="weightKg" name="Weight (kg)" stroke="#39ff14" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Daily Activity Report Table */}
      <div className="fitnex-card p-6 space-y-3">
        <h2 className="text-base font-bold text-white">Daily Activity Report (Last 10 Days)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/8 text-zinc-400 text-xs uppercase">
                <th className="py-2.5 pr-4">Date</th>
                <th className="py-2.5 pr-4">Steps</th>
                <th className="py-2.5 pr-4">Workouts</th>
                <th className="py-2.5 pr-4">Workout Min</th>
                <th className="py-2.5 pr-4">Burned</th>
                <th className="py-2.5 pr-4">Intake</th>
                <th className="py-2.5">Water</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 tabular-nums">
              {[...dailySeries].reverse().slice(0, 10).map((row) => (
                <tr key={row.dateKey}>
                  <td className="py-2.5 pr-4 font-medium text-white">{row.dateKey}</td>
                  <td className="py-2.5 pr-4 text-zinc-200">{row.steps.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-zinc-200">{row.workoutsCount}</td>
                  <td className="py-2.5 pr-4 text-zinc-200">{row.workoutMinutes} min</td>
                  <td className="py-2.5 pr-4 font-semibold text-[#39ff14]">{row.caloriesBurned} kcal</td>
                  <td className="py-2.5 pr-4 text-sky-400">{row.caloriesIntake} kcal</td>
                  <td className="py-2.5 text-zinc-300">{row.waterMl} ml</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
