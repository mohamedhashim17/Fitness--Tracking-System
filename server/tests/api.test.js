const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'memory';
process.env.JWT_SECRET = 'fitnex_test_secret';
process.env.AUTO_SEED_DEMO = 'true';
process.env.PORT = '0';

const { app } = require('../server');
const { connectDB, disconnectDB } = require('../config/db');
const { seedDemoIfEmpty } = require('../utils/seedData');

let server;
let baseUrl;
let authToken;
let workoutId;
let mealId;
let goalId;
let metricId;

const request = async (path, { method = 'GET', body, token } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, data: json, headers: res.headers };
};

describe('FITNEX Full-Stack API Integration Tests', () => {
  before(async () => {
    await connectDB();
    await seedDemoIfEmpty();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  it('health endpoint responds ok', async () => {
    const res = await request('/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'ok');
  });

  it('registers a new user and returns JWT + user profile', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Athlete',
        email: 'testathlete@fitnex.app',
        password: 'Password123!',
        age: 26,
        heightCm: 178,
        weightKg: 75,
        fitnessLevel: 'intermediate',
        primaryGoal: 'weight_loss',
      },
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.token);
    assert.equal(res.data.user.email, 'testathlete@fitnex.app');
    authToken = res.data.token;
  });

  it('completes forgot-password and reset-password flow', async () => {
    const forgot = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: 'testathlete@fitnex.app' },
    });
    assert.equal(forgot.status, 200);
    assert.ok(forgot.data.devResetCode);

    const reset = await request('/auth/reset-password', {
      method: 'POST',
      body: {
        email: 'testathlete@fitnex.app',
        resetCode: forgot.data.devResetCode,
        newPassword: 'NewPassword456!',
      },
    });
    assert.equal(reset.status, 200);

    const login = await request('/auth/login', {
      method: 'POST',
      body: { email: 'testathlete@fitnex.app', password: 'NewPassword456!' },
    });
    assert.equal(login.status, 200);
    authToken = login.data.token;
  });

  it('performs full Workout CRUD and unlocks First Rep badge', async () => {
    const created = await request('/workouts', {
      method: 'POST',
      token: authToken,
      body: {
        title: 'Interval Track Run',
        category: 'Running',
        duration: 35,
        caloriesBurned: 410,
        distanceKm: 5.5,
        intensity: 'High',
      },
    });
    assert.equal(created.status, 201);
    workoutId = created.data.workout._id;
    assert.ok(created.data.newlyEarned.some((b) => b.key === 'first_workout'));

    const list = await request('/workouts?category=Running', { token: authToken });
    assert.equal(list.status, 200);
    assert.equal(list.data.workouts.length, 1);

    const updated = await request(`/workouts/${workoutId}`, {
      method: 'PUT',
      token: authToken,
      body: { duration: 40, caloriesBurned: 460 },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.workout.duration, 40);

    const del = await request(`/workouts/${workoutId}`, { method: 'DELETE', token: authToken });
    assert.equal(del.status, 200);
  });

  it('logs Nutrition meals, searches food library, and updates Water intake', async () => {
    const foods = await request('/nutrition/foods?q=chicken', { token: authToken });
    assert.equal(foods.status, 200);
    assert.ok(foods.data.foods.length >= 1);

    const meal = await request('/nutrition', {
      method: 'POST',
      token: authToken,
      body: {
        mealType: 'Lunch',
        foodName: 'Grilled Chicken Breast',
        calories: 320,
        protein: 46,
        carbs: 12,
        fat: 8,
      },
    });
    assert.equal(meal.status, 201);
    mealId = meal.data.entry._id;

    const water = await request('/nutrition/water', {
      method: 'PUT',
      token: authToken,
      body: { addWaterMl: 2500 },
    });
    assert.equal(water.status, 200);
    assert.equal(water.data.waterMl, 2500);

    const summary = await request('/nutrition', { token: authToken });
    assert.equal(summary.status, 200);
    assert.equal(summary.data.totals.calories, 320);

    await request(`/nutrition/${mealId}`, { method: 'DELETE', token: authToken });
  });

  it('creates Goals, logs Body Metrics with BMI, and reflects dynamically on Dashboard', async () => {
    const goal = await request('/goals', {
      method: 'POST',
      token: authToken,
      body: {
        title: 'Target Weight 72kg',
        type: 'weight_loss',
        targetValue: 72,
      },
    });
    assert.equal(goal.status, 201);
    goalId = goal.data.goal._id;

    const metric = await request('/metrics', {
      method: 'POST',
      token: authToken,
      body: { weightKg: 73.5, heightCm: 178, bodyFatPct: 16.2 },
    });
    assert.equal(metric.status, 201);
    metricId = metric.data.metric._id;
    assert.equal(metric.data.metric.bmi, 23.2);
    assert.equal(metric.data.metric.bmiCategory, 'Normal');

    const dash = await request('/dashboard', { token: authToken });
    assert.equal(dash.status, 200);
    assert.ok(dash.data.today.waterMl >= 2500);
    assert.equal(dash.data.weeklySummary.length, 7);
    assert.equal(dash.data.monthlySummary.length, 30);

    await request(`/goals/${goalId}`, { method: 'DELETE', token: authToken });
    await request(`/metrics/${metricId}`, { method: 'DELETE', token: authToken });
  });

  it('provides Analytics CSV export, AI Assistant insights/recommendations, and Leaderboard', async () => {
    const analytics = await request('/analytics?range=30', { token: authToken });
    assert.equal(analytics.status, 200);
    assert.equal(analytics.data.dailySeries.length, 30);

    const csv = await request('/analytics/export?format=csv&range=7', { token: authToken });
    assert.equal(csv.status, 200);
    assert.ok(csv.data.includes('Date,Steps,Water (ml)'));

    const aiInsights = await request('/ai/insights', { token: authToken });
    assert.equal(aiInsights.status, 200);
    assert.ok(aiInsights.data.insights.workoutSuggestions.length >= 1);

    const aiChat = await request('/ai/chat', {
      method: 'POST',
      token: authToken,
      body: { prompt: 'What should I eat today?' },
    });
    assert.equal(aiChat.status, 200);
    assert.ok(aiChat.data.reply.length > 20);

    const leaderboard = await request('/leaderboard?sortBy=steps', { token: authToken });
    assert.equal(leaderboard.status, 200);
    assert.ok(leaderboard.data.leaderboard.length >= 5);
  });
});
