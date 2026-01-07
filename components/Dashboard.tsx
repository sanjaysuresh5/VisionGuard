
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
    <div className={`transition-opacity duration-500 ${isDisconnected ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
      <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl overflow-hidden relative group">
        {/* Progress Background */}
        <div 
          className={`absolute bottom-0 left-0 h-2 transition-all duration-1000 ease-out ${isAlert ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]' : 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]'}`}
          style={{ width: `${progress}%` }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Session Analytics</h2>
              <div className="h-px flex-1 bg-slate-800 min-w-[40px]"></div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className={`text-8xl font-black tracking-tighter tabular-nums ${isAlert ? 'text-rose-500' : 'text-white'}`}>
                {state.currentStreak}
              </span>
              <div className="flex flex-col">
                 <span className="text-slate-500 font-bold text-xl uppercase tracking-tighter -mb-1">Minutes</span>
                 <span className="text-slate-600 font-medium text-xs">Continuous</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest mb-6 border-2 transition-colors ${
              isAlert 
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-bounce' 
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
            }`}>
              {isAlert ? '⚠️ Look Away Now' : '✨ Focus Phase'}
            </div>
            
            <button 
              onClick={(e) => { e.preventDefault(); onRefresh(); }}
              className="group/btn bg-slate-800 p-4 hover:bg-slate-700 rounded-2xl transition-all text-slate-400 hover:text-white border border-slate-700 active:scale-95"
              title="Sync ActivityWatch Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover/btn:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black/20 p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Active Context</span>
            <span className="text-slate-200 font-bold text-lg truncate block">
              {state.activeApp || 'Initializing...'}
            </span>
          </div>
          <div className="bg-black/20 p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Target Window</span>
            <span className="text-slate-300 font-medium text-sm truncate block italic">
              {state.activeTitle || 'Waiting for heartbeat...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
