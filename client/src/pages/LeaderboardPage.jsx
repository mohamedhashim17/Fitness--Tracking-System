import { useCallback, useEffect, useState } from 'react';
import { Award, Flame, Footprints, Medal, Timer, Trophy } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const TABS = [
  { key: 'steps', label: 'Weekly Steps', icon: Footprints },
  { key: 'minutes', label: 'Workout Minutes', icon: Timer },
  { key: 'calories', label: 'Calories Burned', icon: Flame },
  { key: 'points', label: 'Achievement Score', icon: Award },
];

export default function LeaderboardPage() {
  const { showToast } = useToast();
  const [sortBy, setSortBy] = useState('steps');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leaderboard', { params: { sortBy } });
      setRows(data.leaderboard || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [sortBy, showToast]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-[#39ff14]" />
            FITNEX Community Leaderboard
          </h1>
          <p className="text-sm text-zinc-400">
            Live 7-day rankings comparing steps, workout minutes, calories burned, and achievement scores.
          </p>
        </div>
      </div>

      {/* Sort Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortBy(key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              sortBy === key
                ? 'bg-[#39ff14] text-black'
                : 'bg-[#14171e] text-zinc-300 border border-white/8 hover:border-[#39ff14]/35'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner label="Computing athlete rankings..." />
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rows.slice(0, 3).map((r) => {
              const rankColors = {
                1: 'border-amber-400/50 bg-gradient-to-b from-amber-400/12 to-[#13161d]',
                2: 'border-zinc-300/35 bg-gradient-to-b from-zinc-300/8 to-[#13161d]',
                3: 'border-orange-400/35 bg-gradient-to-b from-orange-400/8 to-[#13161d]',
              };
              return (
                <div key={r.userId} className={`fitnex-card p-5 space-y-3 ${rankColors[r.rank] || ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                      <Medal className="w-4 h-4" />
                      Rank #{r.rank}
                    </span>
                    {r.isCurrentUser && (
                      <span className="px-2 py-0.5 rounded-md bg-[#39ff14] text-black text-[10px] font-extrabold">
                        YOU
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">{r.name}</h3>
                    <p className="text-xs text-zinc-400 capitalize">
                      {r.primaryGoal.replace('_', ' ')} • {r.fitnessLevel}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 tabular-nums">
                    <div className="p-2.5 rounded-xl bg-[#0c0e13]">
                      <p className="text-zinc-500">Weekly Steps</p>
                      <p className="font-bold text-white">{r.weeklySteps.toLocaleString()}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0c0e13]">
                      <p className="text-zinc-500">Achievement Score</p>
                      <p className="font-bold text-[#39ff14]">{r.achievementScore} pts</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Standings Table */}
          <div className="fitnex-card p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-zinc-400 text-xs uppercase">
                    <th className="py-3 pr-4">Rank</th>
                    <th className="py-3 pr-4">Athlete</th>
                    <th className="py-3 pr-4">Weekly Steps</th>
                    <th className="py-3 pr-4">Workout Min</th>
                    <th className="py-3 pr-4">Calories Burned</th>
                    <th className="py-3 pr-4">Streak</th>
                    <th className="py-3 pr-4">Badges</th>
                    <th className="py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 tabular-nums">
                  {rows.map((r) => (
                    <tr
                      key={r.userId}
                      className={r.isCurrentUser ? 'bg-[#39ff14]/8' : 'hover:bg-white/2'}
                    >
                      <td className="py-3 pr-4 font-extrabold text-white">#{r.rank}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{r.name}</span>
                          {r.isCurrentUser && (
                            <span className="px-1.5 py-0.5 rounded bg-[#39ff14] text-black text-[10px] font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-zinc-200">{r.weeklySteps.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-zinc-200">{r.weeklyMinutes} min ({r.weeklyWorkouts}x)</td>
                      <td className="py-3 pr-4 text-amber-400 font-semibold">{r.weeklyCalories.toLocaleString()} kcal</td>
                      <td className="py-3 pr-4 text-zinc-200">{r.workoutStreak}d</td>
                      <td className="py-3 pr-4 text-zinc-200">{r.badgesCount}</td>
                      <td className="py-3 text-right font-bold text-[#39ff14]">{r.achievementScore} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
