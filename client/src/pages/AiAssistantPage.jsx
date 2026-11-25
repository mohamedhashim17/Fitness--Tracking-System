import { useCallback, useEffect, useState } from 'react';
import { Bot, Dumbbell, Lightbulb, Send, Sparkles, Utensils } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const QUICK_PROMPTS = [
  'Suggest a workout for me today',
  'What should I eat to hit my protein goal?',
  'Analyze my BMI and weight progress',
  'How are my steps and hydration today?',
];

export default function AiAssistantPage() {
  const { showToast } = useToast();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am FITNEX Coach — your AI assistant connected directly to your workout, nutrition, body metric, and goal data. Ask me anything!',
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);

  const loadInsights = useCallback(async () => {
    try {
      const { data } = await api.get('/ai/insights');
      setInsights(data.insights);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const sendMessage = async (textToSend) => {
    const q = (textToSend ?? prompt).trim();
    if (!q) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    if (!textToSend) setPrompt('');
    setSending(true);
    try {
      const { data } = await api.post('/ai/chat', { prompt: q });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      if (data.insights) setInsights(data.insights);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading || !insights) return <LoadingSpinner label="Analyzing your fitness profile..." />;

  const { snapshot, dailyTip, recommendedNutrition, workoutSuggestions, goalGuidance } = insights;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#39ff14]/10 border border-[#39ff14]/25 text-xs font-semibold text-[#39ff14] mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Data-Driven AI Coaching
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">AI Fitness Assistant</h1>
        <p className="text-sm text-zinc-400">
          Personalized workout plans, nutrition guidance, daily coaching tips, and interactive Q&A.
        </p>
      </div>

      {/* Daily Tip + Nutrition + Goal Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="fitnex-card p-5 space-y-2 border-[#39ff14]/25">
          <p className="text-xs font-bold uppercase tracking-wider text-[#39ff14] flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4" />
            Daily Fitness Tip
          </p>
          <p className="text-sm text-zinc-200 leading-relaxed">{dailyTip}</p>
        </div>

        <div className="fitnex-card p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Utensils className="w-4 h-4" />
            Nutrition Recommendation
          </p>
          <p className="text-xs text-zinc-400">
            Target: <strong className="text-white">{recommendedNutrition.calorieTarget} kcal</strong> • Protein:{' '}
            <strong className="text-[#39ff14]">{recommendedNutrition.proteinTargetG}g</strong>
          </p>
          <p className="text-sm text-zinc-200 leading-relaxed">{recommendedNutrition.advice}</p>
        </div>

        <div className="fitnex-card p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Dumbbell className="w-4 h-4" />
            Goal & BMI Guidance
          </p>
          <p className="text-xs text-zinc-400">
            BMI <strong className="text-white">{snapshot.bmi}</strong> ({snapshot.bmiCategory}) • Streak:{' '}
            <strong className="text-amber-400">{snapshot.workoutStreak}d</strong>
          </p>
          <p className="text-sm text-zinc-200 leading-relaxed">{goalGuidance}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Interactive AI Coach Chat */}
        <div className="fitnex-card p-5 lg:col-span-3 flex flex-col h-[500px]">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/8">
            <div className="p-2 rounded-xl bg-[#39ff14]/15 text-[#39ff14]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">FITNEX AI Coach Chat</h2>
              <p className="text-[11px] text-zinc-400">Synced with today’s live database records</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#39ff14] text-black font-medium'
                      : 'bg-[#0e1015] border border-white/8 text-zinc-200'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 text-xs bg-[#0e1015] border border-white/8 text-zinc-400">
                  Analyzing your logs...
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-1.5 pb-3">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                type="button"
                onClick={() => sendMessage(qp)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#39ff14]/15 text-[11px] text-zinc-300 hover:text-[#39ff14] transition-colors"
              >
                {qp}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 pt-2 border-t border-white/8"
          >
            <input
              type="text"
              className="fitnex-input text-sm"
              placeholder="Ask about workouts, meals, macros, or weight goals..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              type="submit"
              disabled={sending || !prompt.trim()}
              className="p-3 rounded-xl neon-btn shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Personalized Workout Suggestions */}
        <div className="fitnex-card p-5 lg:col-span-2 space-y-4 overflow-y-auto max-h-[500px]">
          <h2 className="text-base font-bold text-white">Personalized Workout Suggestions</h2>
          <div className="space-y-3">
            {workoutSuggestions.map((w) => (
              <div key={w.id} className="p-4 rounded-xl bg-[#0e1015] border border-white/8 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-[#39ff14]/15 text-[#39ff14] font-bold">
                    {w.category}
                  </span>
                  <span className="text-zinc-400 tabular-nums">
                    {w.duration} min • ~{w.estimatedCalories} kcal
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{w.title}</h3>
                <p className="text-[11px] text-zinc-400">{w.fitReason}</p>
                <ul className="space-y-1 text-xs text-zinc-300 pt-1">
                  {w.exercises.map((ex) => (
                    <li key={ex.name}>• {ex.name} ({ex.detail})</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
