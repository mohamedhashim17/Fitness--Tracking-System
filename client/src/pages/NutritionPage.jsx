import { useCallback, useEffect, useState } from 'react';
import {
  Calculator,
  Droplets,
  Edit3,
  Flame,
  Minus,
  Plus,
  Search,
  Trash2,
  Utensils,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const MACRO_COLORS = ['#39ff14', '#38bdf8', '#f59e0b'];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function NutritionPage() {
  const auth = useAuth();
  const { showToast, notifyBadges } = useToast();

  const [dateKey, setDateKey] = useState(todayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add/Edit Meal Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mealForm, setMealForm] = useState({
    mealType: 'Breakfast',
    foodName: '',
    servingSize: '1 serving',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const [saving, setSaving] = useState(false);

  // Food Calorie Calculator state
  const [foodQuery, setFoodQuery] = useState('');
  const [foodCatalog, setFoodCatalog] = useState([]);
  const [calcMacros, setCalcMacros] = useState({ protein: '30', carbs: '45', fat: '12' });

  const loadNutrition = useCallback(async () => {
    try {
      const { data: res } = await api.get('/nutrition', { params: { date: dateKey } });
      setData(res);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [dateKey, showToast]);

  const loadFoods = useCallback(async (q = '') => {
    try {
      const { data: res } = await api.get('/nutrition/foods', { params: { q } });
      setFoodCatalog(res.foods || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  useEffect(() => {
    loadFoods(foodQuery);
  }, [foodQuery, loadFoods]);

  const handleWater = async (addWaterMl) => {
    try {
      const { data: res } = await api.put('/nutrition/water', { dateKey, addWaterMl });
      if (res.newlyEarned?.length) {
        notifyBadges(res.newlyEarned);
        auth.refreshUser();
      }
      loadNutrition();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openAddMeal = (mealType = 'Breakfast', prefill = null) => {
    setEditingId(null);
    setMealForm({
      mealType,
      foodName: prefill?.name || '',
      servingSize: prefill?.servingSize || '1 serving',
      calories: prefill ? String(prefill.calories) : '',
      protein: prefill ? String(prefill.protein) : '0',
      carbs: prefill ? String(prefill.carbs) : '0',
      fat: prefill ? String(prefill.fat) : '0',
    });
    setModalOpen(true);
  };

  const openEditMeal = (entry) => {
    setEditingId(entry._id);
    setMealForm({
      mealType: entry.mealType,
      foodName: entry.foodName,
      servingSize: entry.servingSize || '1 serving',
      calories: String(entry.calories),
      protein: String(entry.protein),
      carbs: String(entry.carbs),
      fat: String(entry.fat),
    });
    setModalOpen(true);
  };

  const handleSaveMeal = async (e) => {
    e.preventDefault();
    if (!mealForm.foodName.trim() || mealForm.calories === '') {
      showToast('Food name and calories are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...mealForm,
        dateKey,
        calories: Number(mealForm.calories),
        protein: Number(mealForm.protein || 0),
        carbs: Number(mealForm.carbs || 0),
        fat: Number(mealForm.fat || 0),
      };
      if (editingId) {
        await api.put(`/nutrition/${editingId}`, payload);
        showToast('Meal updated!', 'success');
      } else {
        await api.post('/nutrition', payload);
        showToast('Meal logged!', 'success');
      }
      setModalOpen(false);
      loadNutrition();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeal = async (id) => {
    try {
      await api.delete(`/nutrition/${id}`);
      showToast('Meal removed.', 'info');
      loadNutrition();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const calculatedCalories =
    Math.round(Number(calcMacros.protein || 0) * 4 + Number(calcMacros.carbs || 0) * 4 + Number(calcMacros.fat || 0) * 9);

  if (loading || !data) return <LoadingSpinner label="Loading nutrition telemetry..." />;

  const { logs, totals, waterMl, targets, weeklyCalories } = data;
  const calTarget = targets?.caloriesIntake || 2200;
  const waterTarget = targets?.waterMl || 2500;
  const calPct = Math.min(100, Math.round((totals.calories / calTarget) * 100));
  const waterPct = Math.min(100, Math.round((waterMl / waterTarget) * 100));

  const macroPieData = [
    { name: 'Protein (g)', value: totals.protein || 1 },
    { name: 'Carbs (g)', value: totals.carbs || 1 },
    { name: 'Fat (g)', value: totals.fat || 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Diet & Nutrition Tracker</h1>
          <p className="text-sm text-zinc-400">
            Track daily calories, macronutrients, water hydration, and use the food calorie calculator.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            type="date"
            className="fitnex-input !w-auto text-xs"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
          />
          <button type="button" onClick={() => openAddMeal('Breakfast')} className="px-4 py-2.5 rounded-xl neon-btn text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Log Meal</span>
          </button>
        </div>
      </div>

      {/* Top Summary: Calories, Macros, Water */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Nutrition Goals */}
        <div className="fitnex-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-[#39ff14]" />
              Calorie & Macro Goals
            </h2>
            <span className="text-xs font-bold text-[#39ff14] tabular-nums">{calPct}%</span>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5 tabular-nums">
              <span className="font-bold text-white">{totals.calories.toLocaleString()} kcal</span>
              <span className="text-zinc-400">Target: {calTarget.toLocaleString()} kcal</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full bg-[#39ff14] transition-all duration-500" style={{ width: `${calPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {[
              { label: 'Protein', val: totals.protein, target: targets?.proteinG || 140, color: 'text-[#39ff14]' },
              { label: 'Carbs', val: totals.carbs, target: targets?.carbsG || 240, color: 'text-sky-400' },
              { label: 'Fat', val: totals.fat, target: targets?.fatG || 70, color: 'text-amber-400' },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded-xl bg-[#0e1015] border border-white/6">
                <p className="text-[11px] text-zinc-400">{m.label}</p>
                <p className={`text-lg font-extrabold tabular-nums ${m.color}`}>{m.val}g</p>
                <p className="text-[10px] text-zinc-500">Goal {m.target}g</p>
              </div>
            ))}
          </div>
        </div>

        {/* Water Intake Tracker */}
        <div className="fitnex-card p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Droplets className="w-4.5 h-4.5 text-sky-400" />
              Water Intake Tracker
            </h2>
            <span className="text-xs font-bold text-sky-400 tabular-nums">{waterPct}%</span>
          </div>

          <div>
            <p className="text-3xl font-extrabold text-white tabular-nums">
              {waterMl.toLocaleString()} <span className="text-sm font-medium text-zinc-400">/ {waterTarget.toLocaleString()} ml</span>
            </p>
            <div className="h-3 rounded-full bg-zinc-800 overflow-hidden mt-3">
              <div className="h-full rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${waterPct}%` }} />
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              ≈ {Math.round(waterMl / 250)} glass(es) of 250 ml
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleWater(-250)}
              className="p-2.5 rounded-xl bg-[#0e1015] border border-white/10 text-zinc-300 hover:text-white"
              aria-label="Decrease 250ml"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleWater(250)}
              className="flex-1 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-xs font-bold"
            >
              +250 ml Glass
            </button>
            <button
              type="button"
              onClick={() => handleWater(500)}
              className="flex-1 py-2.5 rounded-xl bg-[#39ff14]/15 hover:bg-[#39ff14]/25 border border-[#39ff14]/30 text-[#39ff14] text-xs font-bold"
            >
              +500 ml Bottle
            </button>
          </div>
        </div>

        {/* Macro Split Pie Chart */}
        <div className="fitnex-card p-6 flex flex-col justify-between">
          <h2 className="text-base font-bold text-white mb-2">Macro Split</h2>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroPieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {macroPieData.map((entry, idx) => (
                    <Cell key={entry.name} fill={MACRO_COLORS[idx % MACRO_COLORS.length]} />
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
          <div className="flex justify-center gap-4 text-xs text-zinc-300">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#39ff14]" />Protein</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" />Carbs</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Fat</span>
          </div>
        </div>
      </div>

      {/* Meals by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MEAL_TYPES.map((mealType) => {
          const items = logs.filter((l) => l.mealType === mealType);
          const mealKcal = items.reduce((s, i) => s + i.calories, 0);
          return (
            <div key={mealType} className="fitnex-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#39ff14]" />
                  <h3 className="text-base font-bold text-white">{mealType}</h3>
                  <span className="text-xs text-zinc-400 tabular-nums">({mealKcal} kcal)</span>
                </div>
                <button
                  type="button"
                  onClick={() => openAddMeal(mealType)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#39ff14]/15 text-xs font-semibold text-[#39ff14] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center bg-[#0e1015] rounded-xl border border-white/5">
                  No {mealType.toLowerCase()} items logged for {dateKey}.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item._id}
                      className="p-3 rounded-xl bg-[#0e1015] border border-white/6 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.foodName}</p>
                        <p className="text-[11px] text-zinc-400 tabular-nums">
                          {item.servingSize} • P {item.protein}g • C {item.carbs}g • F {item.fat}g
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-[#39ff14] tabular-nums">{item.calories} kcal</span>
                        <button
                          type="button"
                          onClick={() => openEditMeal(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
                          aria-label="Edit meal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeal(item._id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15"
                          aria-label="Delete meal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Food Calorie Calculator + 7-Day Calorie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="fitnex-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calculator className="w-4.5 h-4.5 text-[#39ff14]" />
              Food Calorie Calculator & Quick Add
            </h2>
          </div>

          {/* Macro-to-calorie calculator */}
          <div className="p-4 rounded-xl bg-[#0e1015] border border-white/8 space-y-3">
            <p className="text-xs font-semibold text-zinc-300">Macro Calorie Estimator (4 kcal/g P & C, 9 kcal/g F)</p>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] text-zinc-400">Protein (g)</label>
                <input
                  type="number"
                  min="0"
                  className="fitnex-input py-1.5 text-xs mt-1"
                  value={calcMacros.protein}
                  onChange={(e) => setCalcMacros({ ...calcMacros, protein: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400">Carbs (g)</label>
                <input
                  type="number"
                  min="0"
                  className="fitnex-input py-1.5 text-xs mt-1"
                  value={calcMacros.carbs}
                  onChange={(e) => setCalcMacros({ ...calcMacros, carbs: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400">Fat (g)</label>
                <input
                  type="number"
                  min="0"
                  className="fitnex-input py-1.5 text-xs mt-1"
                  value={calcMacros.fat}
                  onChange={(e) => setCalcMacros({ ...calcMacros, fat: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-[#39ff14] tabular-nums">
                Estimated: {calculatedCalories} kcal
              </span>
              <button
                type="button"
                onClick={() =>
                  openAddMeal('Lunch', {
                    name: 'Custom Macro Meal',
                    servingSize: '1 meal',
                    calories: calculatedCalories,
                    protein: calcMacros.protein || 0,
                    carbs: calcMacros.carbs || 0,
                    fat: calcMacros.fat || 0,
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-[#39ff14]/15 text-[#39ff14] text-xs font-bold hover:bg-[#39ff14]/25"
              >
                Use in Meal Log
              </button>
            </div>
          </div>

          {/* Search Food Library */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              className="fitnex-input pl-10 py-2 text-xs"
              placeholder="Search food database (e.g., chicken, oats, salmon)..."
              value={foodQuery}
              onChange={(e) => setFoodQuery(e.target.value)}
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {foodCatalog.map((f) => (
              <div
                key={f.name}
                className="p-2.5 rounded-xl bg-[#0e1015] border border-white/6 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-white">{f.name}</p>
                  <p className="text-[11px] text-zinc-400">
                    {f.calories} kcal • P {f.protein}g • C {f.carbs}g • F {f.fat}g
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openAddMeal('Lunch', f)}
                  className="px-2.5 py-1 rounded-lg bg-[#39ff14] text-black font-bold shrink-0"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="fitnex-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">7-Day Calorie Intake Trend</h2>
            <p className="text-xs text-zinc-400 mb-4">Daily calorie intake across the past week</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyCalories}>
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
                <Bar dataKey="calories" name="Calories (kcal)" fill="#39ff14" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Add/Edit Meal Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Meal Entry' : 'Log Food / Meal'}
        subtitle={`Recording nutrition for ${dateKey}`}
      >
        <form onSubmit={handleSaveMeal} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Meal Category</label>
              <select
                className="fitnex-input"
                value={mealForm.mealType}
                onChange={(e) => setMealForm({ ...mealForm, mealType: e.target.value })}
              >
                {MEAL_TYPES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Serving Size</label>
              <input
                type="text"
                className="fitnex-input"
                value={mealForm.servingSize}
                onChange={(e) => setMealForm({ ...mealForm, servingSize: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Food Name</label>
            <input
              type="text"
              className="fitnex-input"
              placeholder="e.g., Grilled Chicken & Brown Rice"
              value={mealForm.foodName}
              onChange={(e) => setMealForm({ ...mealForm, foodName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Calories</label>
              <input
                type="number"
                min="0"
                className="fitnex-input"
                value={mealForm.calories}
                onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Protein (g)</label>
              <input
                type="number"
                min="0"
                className="fitnex-input"
                value={mealForm.protein}
                onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Carbs (g)</label>
              <input
                type="number"
                min="0"
                className="fitnex-input"
                value={mealForm.carbs}
                onChange={(e) => setMealForm({ ...mealForm, carbs: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Fat (g)</label>
              <input
                type="number"
                min="0"
                className="fitnex-input"
                value={mealForm.fat}
                onChange={(e) => setMealForm({ ...mealForm, fat: e.target.value })}
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
              {saving ? 'Saving...' : editingId ? 'Update Meal' : 'Add Meal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
