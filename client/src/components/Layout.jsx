import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Dumbbell,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Target,
  Trophy,
  UserCircle2,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell },
  { to: '/nutrition', label: 'Diet & Nutrition', icon: Utensils },
  { to: '/goals', label: 'Fitness Goals', icon: Target },
  { to: '/metrics', label: 'Body Metrics', icon: Scale },
  { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { to: '/ai-coach', label: 'AI Fitness Coach', icon: Bot },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile', label: 'Profile & Settings', icon: UserCircle2 },
];

function SidebarContent({ user, onCloseMobile, onLogout }) {
  return (
    <div className="flex flex-col h-full bg-[#0d0f13] border-r border-white/8">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center justify-between border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#39ff14] text-black flex items-center justify-center shadow-[0_0_20px_rgba(57,255,20,0.45)]">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              FIT<span className="text-[#39ff14]">NEX</span>
            </span>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
              Smart Tracker
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User Mini Pill */}
      <div className="px-4 py-4">
        <div className="p-3 rounded-xl bg-[#151820] border border-white/8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#39ff14]/30 to-emerald-600/20 border border-[#39ff14]/40 flex items-center justify-center text-sm font-bold text-[#39ff14]">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-zinc-400 capitalize truncate">
              {(user?.primaryGoal || 'general_fitness').replace('_', ' ')} • {user?.fitnessLevel}
            </p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#39ff14] text-black font-bold shadow-[0_0_20px_-6px_rgba(57,255,20,0.8)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Logout */}
      <div className="p-4 border-t border-white/8">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout, unreadNotifications, setUnreadNotifications } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  const openNotifications = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      try {
        const { data } = await api.get('/auth/notifications');
        setNotifications(data.notifications || []);
      } catch {
        // ignore transient error
      }
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/auth/notifications/read-all');
      setUnreadNotifications(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-zinc-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-66 shrink-0 sticky top-0 h-screen no-print">
        <SidebarContent user={user} onCloseMobile={() => setSidebarOpen(false)} onLogout={handleLogout} />
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            <SidebarContent user={user} onCloseMobile={() => setSidebarOpen(false)} onLogout={handleLogout} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#090a0c]/85 backdrop-blur-md border-b border-white/8 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[#151820] border border-white/10 text-zinc-200 hover:border-[#39ff14]/40"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
              <Activity className="w-4 h-4 text-[#39ff14]" />
              <span className="hidden sm:inline">Live Telemetry Sync</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#39ff14]/10 text-[#39ff14] text-xs font-semibold border border-[#39ff14]/25">
                <Flame className="w-3.5 h-3.5" />
                {(user?.badges || []).length} Badges
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              type="button"
              onClick={openNotifications}
              className="relative p-2.5 rounded-xl bg-[#151820] border border-white/10 text-zinc-300 hover:text-white hover:border-[#39ff14]/40 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#39ff14] text-black text-[10px] font-extrabold flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-13 w-80 sm:w-96 rounded-2xl bg-[#14171d] border border-white/12 shadow-2xl p-4 z-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white">Notifications</h4>
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs text-[#39ff14] hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">No notifications yet.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`p-3 rounded-xl border text-xs ${
                          n.read
                            ? 'bg-[#101217] border-white/5 text-zinc-400'
                            : 'bg-[#191e26] border-[#39ff14]/25 text-zinc-100'
                        }`}
                      >
                        <p className="font-semibold text-white">{n.title}</p>
                        <p className="mt-0.5 text-zinc-400">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
