import { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Dumbbell,
  Edit3,
  Flame,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORIES = [
  'Running',
  'Walking',
  'Cycling',
  'Gym',
  'Yoga',
  'Swimming',
  'Strength Training',
];

const MET_BY_CATEGORY = {
  Running: 9.8,
  Walking: 3.8,
  Cycling: 7.5,
  Gym: 6.2,
  Yoga: 3.0,
  Swimming: 8.3,
  'Strength Training': 6.0,
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = {
  title: '',
  category: 'Running',
  duration: '30',
  caloriesBurned: '280',
  distanceKm: '0',
  intensity: 'Moderate',
  sets: '0',
  reps: '0',
  weightLiftedKg: '0',
  dateKey: todayStr(),
  notes: '',
};

export default function WorkoutsPage() {
  const { user, refreshUser } = useAuth();
  const { showToast, notifyBadges } = useToast();

  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Smart Workout Recommendation state
  const [recGoal, setRecGoal] = useState(user?.primaryGoal || 'general_fitness');
  const [recLevel, setRecLevel] = useState(user?.fitnessLevel || 'intermediate');
  const [recDuration, setRecDuration] = useState('30');
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRec, setLoadingRec] = useState(false);

  const loadWorkouts = useCallback(async () => {
    try {
      const params = {};
      if (filterCategory !== 'All') params.category = filterCategory;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/workouts', { params });
      setWorkouts(data.workouts || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, search, showToast]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const estimateCalories = (cat = form.category, dur = form.duration, inten = form.intensity) => {
    const met = MET_BY_CATEGORY[cat] || 6;
    const factor = inten === 'High' ? 1.2 : inten === 'Low' ? 0.8 : 1;
    const weight = user?.weightKg || 72;
    const kcal = Math.round(((met * factor * 3.5 * weight) / 200) * (Number(dur) || 30));
    setForm((prev) => ({ ...prev, caloriesBurned: String(kcal) }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm, dateKey: todayStr() });
    setModalOpen(true);
  };

  const openEditModal = (w) => {
    setEditingId(w._id);
    setForm({
      title: w.title,
      category: w.category,
      duration: String(w.duration),
      caloriesBurned: String(w.caloriesBurned),
      distanceKm: String(w.distanceKm || 0),
      intensity: w.intensity || 'Moderate',
      sets: String(w.sets || 0),
      reps: String(w.reps || 0),
      weightLiftedKg: String(w.weightLiftedKg || 0),
      dateKey: w.dateKey,
      notes: w.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 2) {
      showToast('Workout title must be at least 2 characters.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        duration: Number(form.duration),
        caloriesBurned: Number(form.caloriesBurned),
        distanceKm: Number(form.distanceKm || 0),
        sets: Number(form.sets || 0),
        reps: Number(form.reps || 0),
        weightLiftedKg: Number(form.weightLiftedKg || 0),
      };

      if (editingId) {
        await api.put(`/workouts/${editingId}`, payload);
        showToast('Workout updated!', 'success');
      } else {
        const { data } = await api.post('/workouts', payload);
        showToast('Workout logged!', 'success');
        if (data.newlyEarned?.length) {
          notifyBadges(data.newlyEarned);
          refreshUser();
        }
      }
      setModalOpen(false);
      loadWorkouts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/workouts/${id}`);
      showToast('Workout record deleted.', 'info');
      setWorkouts((prev) => prev.filter((w) => w._id !== id));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRec(true);
    try {
      const { data } = await api.post('/ai/recommend-workouts', {
        goal: recGoal,
        fitnessLevel: recLevel,
        duration: Number(recDuration),
      });
      setRecommendations(data.recommendations || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingRec(false);
    }
  };

  const quickLogRecommended = async (rec) => {
    try {
      const { data } = await api.post('/workouts', {
        title: rec.title,
        category: rec.category,
        duration: rec.duration,
        caloriesBurned: rec.estimatedCalories,
        intensity: rec.intensity,
        dateKey: todayStr(),
        notes: rec.exercises.map((e) => `${e.name} (${e.detail})`).join(' • '),
      });
      showToast(`Logged "${rec.title}"!`, 'success');
      if (data.newlyEarned?.length) {
        notifyBadges(data.newlyEarned);
        refreshUser();
      }
      loadWorkouts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const totalMins = workouts.reduce((s, w) => s + (w.duration || 0), 0);
  const totalKcal = workouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Workout Tracker</h1>
          <p className="text-sm text-zinc-400">
            Log training sessions across 7 disciplines, track volume, or generate a smart routine.
          </p>
        </div>
        <button type="button" onClick={openAddModal} className="px-4 py-2.5 rounded-xl neon-btn text-sm flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Add Workout</span>
        </button>
      </div>

      {/* Smart Workout Recommender */}
      <div className="fitnex-card p-5 sm:p-6 border-[#39ff14]/20 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-[#39ff14]" />
              Smart Workout Recommendation
            </h2>
            <p className="text-xs text-zinc-400">
              Tailored sessions based on your goal, fitness level, and available minutes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              className="fitnex-input !w-auto text-xs"
              value={recGoal}
              onChange={(e) => setRecGoal(e.target.value)}
            >
              <option value="weight_loss">Weight Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="endurance">Endurance</option>
              <option value="general_fitness">General Fitness</option>
            </select>
            <select
              className="fitnex-input !w-auto text-xs"
              value={recLevel}
              onChange={(e) => setRecLevel(e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <select
              className="fitnex-input !w-auto text-xs"
              value={recDuration}
              onChange={(e) => setRecDuration(e.target.value)}
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
            <button
              type="button"
              onClick={fetchRecommendations}
              disabled={loadingRec}
              className="px-4 py-2 rounded-xl bg-[#39ff14]/15 hover:bg-[#39ff14]/25 border border-[#39ff14]/35 text-[#39ff14] text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{loadingRec ? 'Generating...' : 'Suggest Workouts'}</span>
            </button>
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {recommendations.map((rec) => (
              <div key={rec.id} className="p-4 rounded-xl bg-[#0d1015] border border-white/8 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-[#39ff14]/15 text-[#39ff14] font-semibold">
                      {rec.category}
                    </span>
                    <span className="text-zinc-400">
                      {rec.duration} min • ~{rec.estimatedCalories} kcal
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                  <ul className="space-y-1 text-xs text-zinc-400">
                    {rec.exercises.map((ex) => (
                      <li key={ex.name}>• {ex.name} — <span className="text-zinc-300">{ex.detail}</span></li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => quickLogRecommended(rec)}
                  className="w-full py-2 rounded-lg neon-btn text-xs"
                >
                  Log This Workout
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters & Summary Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterCategory === cat
                  ? 'bg-[#39ff14] text-black font-bold'
                  : 'bg-[#14171e] text-zinc-400 hover:text-white border border-white/8'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              className="fitnex-input pl-10 py-2 text-xs"
              placeholder="Search workouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400 px-3 py-2 rounded-xl bg-[#14171e] border border-white/8 tabular-nums">
            <span><strong className="text-white">{workouts.length}</strong> logs</span>
            <span>•</span>
            <span><strong className="text-[#39ff14]">{totalMins}</strong> min</span>
            <span>•</span>
            <span><strong className="text-amber-400">{totalKcal.toLocaleString()}</strong> kcal</span>
          </div>
        </div>
      </div>

      {/* Workout History List */}
      {loading ? (
        <LoadingSpinner label="Loading workout history..." />
      ) : workouts.length === 0 ? (
        <div className="fitnex-card p-12 text-center space-y-3">
          <Dumbbell className="w-10 h-10 text-zinc-600 mx-auto" />
          <p className="text-base font-semibold text-white">No workouts match your filter</p>
          <p className="text-xs text-zinc-400">Click "Add Workout" to record your first session.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workouts.map((w) => (
            <div key={w._id} className="fitnex-card p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#39ff14]/15 text-[#39ff14] text-[11px] font-bold">
                      {w.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 text-[11px] font-medium">
                      {w.intensity}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {w.dateKey}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-2">{w.title}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(w)}
                    className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Edit workout"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(w._id)}
                    className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                    aria-label="Delete workout"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#0e1015] border border-white/5">
                  <p className="text-zinc-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Duration</p>
                  <p className="font-bold text-white mt-0.5 tabular-nums">{w.duration} min</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0e1015] border border-white/5">
                  <p className="text-zinc-500 flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-400" /> Burned</p>
                  <p className="font-bold text-[#39ff14] mt-0.5 tabular-nums">{w.caloriesBurned} kcal</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0e1015] border border-white/5">
                  <p className="text-zinc-500">Details</p>
                  <p className="font-bold text-zinc-200 mt-0.5 tabular-nums">
                    {w.distanceKm > 0
                      ? `${w.distanceKm} km`
                      : w.sets > 0
                        ? `${w.sets}x${w.reps} @ ${w.weightLiftedKg}kg`
                        : 'Session'}
                  </p>
                </div>
              </div>

              {w.notes && <p className="text-xs text-zinc-400 border-t border-white/6 pt-2.5">{w.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Workout Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Workout Record' : 'Log New Workout'}
        subtitle="Track duration, calories burned, and category details."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Workout Title</label>
            <input
              type="text"
              className="fitnex-input"
              placeholder="e.g., Morning 5K Tempo Run"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Category</label>
              <select
                className="fitnex-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Duration (min)</label>
              <input
                type="number"
                min="1"
                max="600"
                className="fitnex-input"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Intensity</label>
              <select
                className="fitnex-input"
                value={form.intensity}
                onChange={(e) => setForm({ ...form, intensity: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="fitnex-input"
                value={form.distanceKm}
                onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-400">Calories Burned (kcal)</label>
              <button
                type="button"
                onClick={() => estimateCalories()}
                className="text-[11px] font-semibold text-[#39ff14] hover:underline"
              >
                Auto-Estimate from Duration & Weight
              </button>
            </div>
            <input
              type="number"
              min="0"
              max="5000"
              className="fitnex-input"
              value={form.caloriesBurned}
              onChange={(e) => setForm({ ...form, caloriesBurned: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Sets</label>
              <input
                type="number"
                min="0"
                className="fitnex-input"
                value={form.sets}
                onChange={(e) => setForm({ ...form, sets: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Reps</label>
              <input
                type="number"
                min="0"
                className="fitnex-input"
                value={form.reps}
                onChange={(e) => setForm({ ...form, reps: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="fitnex-input"
                value={form.weightLiftedKg}
                onChange={(e) => setForm({ ...form, weightLiftedKg: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
            <textarea
              rows={2}
              className="fitnex-input"
              placeholder="How did the session feel? Any PRs?"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
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
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Workout'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
