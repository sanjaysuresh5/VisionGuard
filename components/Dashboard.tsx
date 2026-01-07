
import React from 'react';
import { AppState, ConnectionStatus } from '../types';

interface DashboardProps {
  state: AppState;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onRefresh }) => {
  const progress = Math.min((state.currentStreak / 20) * 100, 100);
  const isAlert = state.currentStreak >= 20;
  const isDisconnected = state.status !== ConnectionStatus.CONNECTED;

  return (
    <div className={`transition-all duration-700 ${isDisconnected ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>
      <div className="bg-[#0a0a0a] rounded-lg p-10 border border-white/5 relative overflow-hidden">
        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
        
        <div className="relative z-20">
          <div className="flex justify-between items-start mb-12">
            <div>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-2">Primary Monitor</p>
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                {state.activeApp || 'NO_CONTEXT'}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mb-2">Duration</p>
              <div className="flex items-baseline gap-2 justify-end">
                <span className={`text-5xl font-black tabular-nums ${isAlert ? 'text-rose-500' : 'text-indigo-400'}`}>
                  {state.currentStreak}
                </span>
                <span className="text-slate-500 text-xs font-bold uppercase">Min</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
             <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Safe Zone</span>
                <span>Threshold reached at 20m</span>
             </div>
             <div className="h-4 bg-white/5 rounded-sm overflow-hidden p-1 border border-white/10">
                <div 
                  className={`h-full transition-all duration-1000 ease-in-out ${isAlert ? 'bg-rose-500' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'}`}
                  style={{ width: `${progress}%` }}
                />
             </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-8">
            <div className="group">
              <p className="text-[9px] text-slate-600 uppercase font-black mb-1 group-hover:text-indigo-500 transition-colors">Thread ID</p>
              <p className="text-xs font-bold text-slate-400 break-all leading-relaxed">
                {state.activeTitle || 'awaiting_sync_signal...'}
              </p>
            </div>
            <div className="flex flex-col items-end justify-center">
              <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-tighter border ${isAlert ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-indigo-500 text-indigo-500 bg-indigo-500/10'}`}>
                {isAlert ? 'SYSTEM_ALERT: VISION_STRAIN' : 'HEALTH_STATUS: OPTIMAL'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
