import { useCallback, useEffect, useState } from 'react';
import { Plus, Ruler, Scale, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function MetricsPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    dateKey: todayStr(),
    weightKg: String(user?.weightKg || 72),
    heightCm: String(user?.heightCm || 175),
    bodyFatPct: '',
    chestCm: '',
    waistCm: '',
    hipsCm: '',
    armsCm: '',
    thighsCm: '',
    notes: '',
  });

  const loadMetrics = useCallback(async () => {
    try {
      const { data: res } = await api.get('/metrics');
      setData(res);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Live BMI preview in modal
  const previewBmi = (() => {
    const w = Number(form.weightKg);
    const h = Number(form.heightCm) / 100;
    if (!w || !h) return '0.0';
    return (w / (h * h)).toFixed(1);
  })();

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/metrics', {
        dateKey: form.dateKey,
        weightKg: Number(form.weightKg),
        heightCm: Number(form.heightCm),
        ...(form.bodyFatPct && { bodyFatPct: Number(form.bodyFatPct) }),
        ...(form.chestCm && { chestCm: Number(form.chestCm) }),
        ...(form.waistCm && { waistCm: Number(form.waistCm) }),
        ...(form.hipsCm && { hipsCm: Number(form.hipsCm) }),
        ...(form.armsCm && { armsCm: Number(form.armsCm) }),
        ...(form.thighsCm && { thighsCm: Number(form.thighsCm) }),
        notes: form.notes,
      });
      showToast('Body measurement logged & BMI calculated!', 'success');
      setModalOpen(false);
      refreshUser();
      loadMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/metrics/${id}`);
      showToast('Measurement entry deleted.', 'info');
      loadMetrics();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading || !data) return <LoadingSpinner label="Loading body composition history..." />;

  const { metrics, chartData, summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Body Measurements & BMI</h1>
          <p className="text-sm text-zinc-400">
            Record weight, height, auto-calculated BMI, body fat %, and circumference measurements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl neon-btn text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Measurement</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Weight"
          value={`${summary.currentWeightKg} kg`}
          subtitle={
            summary.weightDelta === 0
              ? 'Baseline recorded'
              : `${summary.weightDelta > 0 ? '+' : ''}${summary.weightDelta} kg since first log`
          }
          icon={Scale}
          accent="neon"
        />
        <StatCard
          title="Calculated BMI"
          value={summary.bmi}
          subtitle={`Category: ${summary.bmiCategory}`}
          icon={Ruler}
          accent="sky"
        />
        <StatCard
          title="Height"
          value={`${summary.heightCm} cm`}
          subtitle="Used for BMI computation"
          icon={TrendingUp}
          accent="purple"
        />
        <StatCard
          title="Total Change"
          value={`${summary.weightDelta > 0 ? '+' : ''}${summary.weightDelta} kg`}
          subtitle={`${metrics.length} check-in(s) logged`}
          icon={summary.weightDelta <= 0 ? TrendingDown : TrendingUp}
          accent="emerald"
        />
      </div>

      {/* Weight Progress Chart */}
      <div className="fitnex-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Weight Progress Chart</h2>
          <p className="text-xs text-zinc-400">Chronological weight & BMI progression</p>
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-zinc-500 py-10 text-center">Log your first measurement to generate the trend chart.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#39ff14" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#39ff14" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="weightKg"
                  name="Weight (kg)"
                  stroke="#39ff14"
                  strokeWidth={2.5}
                  fill="url(#weightGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Measurement History Table */}
      <div className="fitnex-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Measurement History</h2>
        {metrics.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">No measurements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/8 text-zinc-400 text-xs uppercase">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Weight</th>
                  <th className="py-3 pr-4">BMI</th>
                  <th className="py-3 pr-4">Body Fat</th>
                  <th className="py-3 pr-4">Waist / Chest</th>
                  <th className="py-3 pr-4">Arms / Thighs</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {metrics.map((m) => (
                  <tr key={m._id} className="hover:bg-white/2">
                    <td className="py-3 pr-4 font-medium text-white tabular-nums">{m.dateKey}</td>
                    <td className="py-3 pr-4 font-bold text-[#39ff14] tabular-nums">{m.weightKg} kg</td>
                    <td className="py-3 pr-4 text-zinc-200 tabular-nums">
                      {m.bmi} <span className="text-xs text-zinc-400">({m.bmiCategory})</span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-300 tabular-nums">
                      {m.bodyFatPct ? `${m.bodyFatPct}%` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300 tabular-nums">
                      {m.waistCm || '—'} / {m.chestCm || '—'} cm
                    </td>
                    <td className="py-3 pr-4 text-zinc-300 tabular-nums">
                      {m.armsCm || '—'} / {m.thighsCm || '—'} cm
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(m._id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15"
                        aria-label="Delete measurement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Measurement Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log Body Measurements"
        subtitle={`Live Preview BMI: ${previewBmi}`}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                className="fitnex-input"
                value={form.dateKey}
                onChange={(e) => setForm({ ...form, dateKey: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="400"
                className="fitnex-input"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Height (cm)</label>
              <input
                type="number"
                step="0.5"
                min="80"
                max="260"
                className="fitnex-input"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Body Fat (%)</label>
              <input
                type="number"
                step="0.1"
                className="fitnex-input"
                placeholder="Optional"
                value={form.bodyFatPct}
                onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Waist (cm)</label>
              <input
                type="number"
                step="0.5"
                className="fitnex-input"
                placeholder="Optional"
                value={form.waistCm}
                onChange={(e) => setForm({ ...form, waistCm: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Chest (cm)</label>
              <input
                type="number"
                step="0.5"
                className="fitnex-input"
                placeholder="Optional"
                value={form.chestCm}
                onChange={(e) => setForm({ ...form, chestCm: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Hips (cm)</label>
              <input
                type="number"
                step="0.5"
                className="fitnex-input"
                value={form.hipsCm}
                onChange={(e) => setForm({ ...form, hipsCm: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Arms (cm)</label>
              <input
                type="number"
                step="0.5"
                className="fitnex-input"
                value={form.armsCm}
                onChange={(e) => setForm({ ...form, armsCm: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Thighs (cm)</label>
              <input
                type="number"
                step="0.5"
                className="fitnex-input"
                value={form.thighsCm}
                onChange={(e) => setForm({ ...form, thighsCm: e.target.value })}
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
              {saving ? 'Saving...' : 'Save Measurement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
