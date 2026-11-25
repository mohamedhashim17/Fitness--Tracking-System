import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading FITNEX data...', fullScreen = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        fullScreen ? 'min-h-screen bg-[#090a0c]' : 'py-16'
      }`}
    >
      <div className="relative">
        <div className="w-11 h-11 rounded-full border-2 border-[#39ff14]/20" />
        <Loader2 className="w-11 h-11 text-[#39ff14] animate-spin absolute inset-0" />
      </div>
      <p className="text-sm text-zinc-400 font-medium">{label}</p>
    </div>
  );
}
