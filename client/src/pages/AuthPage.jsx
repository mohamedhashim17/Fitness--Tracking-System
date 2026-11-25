import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, KeyRound, Lock, Mail, Sparkles, User, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

export default function AuthPage() {
  const { user, login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Login / Register state
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    age: '25',
    gender: 'prefer_not_to_say',
    heightCm: '175',
    weightKg: '72',
    fitnessLevel: 'intermediate',
    primaryGoal: 'general_fitness',
  });

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devResetHint, setDevResetHint] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: request code, 2: confirm new password

  if (user) return <Navigate to="/" replace />;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        showToast('Welcome back to FITNEX!', 'success');
        navigate('/');
      } else if (mode === 'register') {
        if (form.name.trim().length < 2) {
          setError('Please enter your full name (at least 2 characters).');
          setSubmitting(false);
          return;
        }
        await register({
          ...form,
          age: Number(form.age),
          heightCm: Number(form.heightCm),
          weightKg: Number(form.weightKg),
        });
        showToast('Account created! Welcome to FITNEX.', 'success');
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      await login('alex@fitnex.app', 'Password123!');
      showToast('Signed in as Demo Athlete (Alex Mercer)', 'success');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!resetEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: resetEmail });
      showToast(data.message, 'info');
      if (data.devResetCode) {
        setDevResetHint(data.devResetCode);
      }
      setResetStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!resetCode.trim() || newPassword.length < 6) {
      setError('Enter the reset code and a new password (min 6 characters).');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: resetEmail,
        resetCode,
        newPassword,
      });
      showToast(data.message, 'success');
      setMode('login');
      setForm((prev) => ({ ...prev, email: resetEmail, password: '' }));
      setResetStep(1);
      setDevResetHint('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-zinc-100 flex flex-col lg:flex-row">
      {/* Left Brand Showcase */}
      <div className="lg:w-5/12 p-8 sm:p-12 flex flex-col justify-between bg-gradient-to-br from-[#0e1116] via-[#0a0c10] to-[#081207] border-b lg:border-b-0 lg:border-r border-white/8 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#39ff14]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#39ff14] text-black flex items-center justify-center shadow-[0_0_24px_rgba(57,255,20,0.5)]">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              FIT<span className="text-[#39ff14]">NEX</span>
            </span>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Smart Fitness Tracker</p>
          </div>
        </div>

        <div className="relative z-10 my-10 lg:my-0 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#39ff14]/10 border border-[#39ff14]/25 text-xs font-semibold text-[#39ff14]">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Performance Platform
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-white">
            Train Smarter. <span className="text-[#39ff14]">Measure Everything.</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-md leading-relaxed">
            Track workouts, macro nutrition, hydration, body composition, streaks, and global rankings in one commercial-grade dark telemetry hub.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 max-w-md">
            {[
              'Real-time Workout CRUD',
              'Macro & Water Calculator',
              'AI Fitness Coaching',
              'Streaks & Leaderboard',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-[#39ff14] shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-zinc-500">
          Secured with bcrypt hashing & JWT authentication.
        </p>
      </div>

      {/* Right Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md fitnex-card p-6 sm:p-8">
          {/* Tabs */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0d0f14] border border-white/8 mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                  mode === 'login' ? 'bg-[#39ff14] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                  mode === 'register' ? 'bg-[#39ff14] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {mode === 'forgot' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-[#39ff14]" />
                <h2 className="text-xl font-bold text-white">Reset Password</h2>
              </div>

              {resetStep === 1 ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <p className="text-xs text-zinc-400">
                    Enter your registered email address to generate a secure 15-minute reset code.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      className="fitnex-input"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl neon-btn text-sm">
                    {submitting ? 'Generating Code...' : 'Send Reset Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmReset} className="space-y-4">
                  {devResetHint && (
                    <div className="p-3 rounded-xl bg-[#39ff14]/10 border border-[#39ff14]/30 text-xs text-[#9eff6e]">
                      Development Reset Code: <strong className="font-mono text-sm">{devResetHint}</strong>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reset Code</label>
                    <input
                      type="text"
                      className="fitnex-input font-mono uppercase"
                      placeholder="e.g. A1B2C3"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">New Password</label>
                    <input
                      type="password"
                      className="fitnex-input"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl neon-btn text-sm">
                    {submitting ? 'Updating Password...' : 'Confirm Password Reset'}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => { setMode('login'); setResetStep(1); setError(''); }}
                className="text-xs text-zinc-400 hover:text-[#39ff14] transition-colors"
              >
                ← Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      className="fitnex-input pl-10"
                      placeholder="Alex Mercer"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    className="fitnex-input pl-10"
                    placeholder="athlete@fitnex.app"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-400">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); }}
                      className="text-xs text-[#39ff14] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    className="fitnex-input pl-10"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                  />
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Age</label>
                      <input
                        type="number"
                        min="13"
                        max="120"
                        className="fitnex-input"
                        value={form.age}
                        onChange={(e) => handleChange('age', e.target.value)}
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
                        onChange={(e) => handleChange('heightCm', e.target.value)}
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
                        onChange={(e) => handleChange('weightKg', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Fitness Level</label>
                      <select
                        className="fitnex-input"
                        value={form.fitnessLevel}
                        onChange={(e) => handleChange('fitnessLevel', e.target.value)}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Primary Goal</label>
                      <select
                        className="fitnex-input"
                        value={form.primaryGoal}
                        onChange={(e) => handleChange('primaryGoal', e.target.value)}
                      >
                        <option value="general_fitness">General Fitness</option>
                        <option value="weight_loss">Weight Loss</option>
                        <option value="muscle_gain">Muscle Gain</option>
                        <option value="endurance">Endurance</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl neon-btn text-sm flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Authenticating...' : mode === 'login' ? 'Sign In to FITNEX' : 'Create FITNEX Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {mode === 'login' && (
                <div className="pt-3 border-t border-white/8">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDemoLogin}
                    className="w-full py-2.5 rounded-xl bg-[#191d25] hover:bg-[#222733] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Activity className="w-4 h-4 text-[#39ff14]" />
                    <span>Instant Demo Sign-In (alex@fitnex.app)</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
