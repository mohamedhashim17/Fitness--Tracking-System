/**
 * Returns local YYYY-MM-DD date string for a Date object (defaults to today).
 */
const toDateKey = (input = new Date()) => {
  const d = new Date(input);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns an array of YYYY-MM-DD date keys going back `days` days (including today).
 */
const getPastDateKeys = (days, endDate = new Date()) => {
  const keys = [];
  const base = new Date(endDate);
  base.setHours(12, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    keys.push(toDateKey(d));
  }
  return keys;
};

/**
 * Formats YYYY-MM-DD as short readable label like "Nov 25".
 */
const formatShortDate = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const calculateBmi = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return { bmi: 0, category: 'Unknown' };
  const hM = heightCm / 100;
  const bmi = Number((weightKg / (hM * hM)).toFixed(1));
  let category = 'Normal';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { bmi, category };
};

module.exports = {
  toDateKey,
  getPastDateKeys,
  formatShortDate,
  calculateBmi,
};
