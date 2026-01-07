import React, { useState, useEffect, useCallback } from 'react';
import { ActivityWatchService } from './services/activityWatch.ts';
import { GeminiCoach } from './services/gemini.ts';
import { AppState, ConnectionStatus, BreakSuggestion } from './types.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { AIRecommendations } from './components/AIRecommendations.tsx';

const REFRESH_INTERVAL = 10000; 
const BREAK_THRESHOLD = 20;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentStreak: 0,
    isAway: false,
    lastActive: new Date(),
    status: ConnectionStatus.IDLE,
    activeApp: '',
    activeTitle: ''
  });

  const [suggestion, setSuggestion] = useState<BreakSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [logs, setLogs] = useState<string[]>(["[SYS] Initializing VisionGuard Stack..."]);

  const addLog = (msg: string) => {
    setLogs(prev => [ `[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 5));
  };

  const fetchActivity = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTING }));
      const latestEvent = await ActivityWatchService.getLatestEvent();
      
      if (latestEvent) {
        const eventTime = new Date(latestEvent.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - eventTime.getTime();
        const isActuallyAway = diffMs > (60 * 1000 * 5); 

        setState(prev => {
          const newStreak = isActuallyAway ? 0 : prev.currentStreak + (REFRESH_INTERVAL / 60000);
          const roundedStreak = Math.floor(newStreak);

          if (roundedStreak >= BREAK_THRESHOLD && prev.currentStreak < BREAK_THRESHOLD) {
            triggerBreak(latestEvent.data.app);
          }

          if (latestEvent.data.app !== prev.activeApp) {
            addLog(`Switch: ${latestEvent.data.app}`);
          }

          return {
            ...prev,
            currentStreak: roundedStreak,
            isAway: isActuallyAway,
            lastActive: eventTime,
            activeApp: latestEvent.data.app,
            activeTitle: latestEvent.data.title,
            status: ConnectionStatus.CONNECTED
          };
        });
      }
    } catch (e: any) {
      console.error("Bridge Error:", e);
      setState(prev => ({ ...prev, status: ConnectionStatus.ERROR }));
    }
  }, [state.activeApp]); // Re-memoize if activeApp changes to ensure logs stay current

  const triggerBreak = async (app: string) => {
    addLog(`ALERT: 20m threshold reached in ${app}`);
    if (Notification.permission === 'granted') {
      new Notification('VisionGuard: 20-20-20 Rule', {
        body: `Step away from ${app}. Look 20ft away.`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966486.png'
      });
    }

    setLoadingSuggestion(true);
    const advice = await GeminiCoach.getBreakSuggestion(app);
    setSuggestion(advice);
    setLoadingSuggestion(false);
  };

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    fetchActivity();
    const interval = setInterval(fetchActivity, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-mono p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-widest uppercase">VisionGuard v2.0</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Python/Flask Stack • Ocular Defense</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Bridge Connection</span>
                <span className={`text-xs font-bold uppercase ${state.status === ConnectionStatus.CONNECTED ? 'text-indigo-400' : 'text-rose-500'}`}>
                  {state.status === ConnectionStatus.CONNECTED ? 'Active (HTTP:5000)' : 'Disconnected'}
                </span>
             </div>
             <div className={`w-3 h-3 rounded-full ${state.status === ConnectionStatus.CONNECTED ? 'bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-rose-500'}`}></div>
          </div>
        </header>

        {state.status === ConnectionStatus.ERROR && (
          <div className="bg-rose-500/5 border border-rose-500/20 p-8 rounded-lg space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 text-rose-500">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
               <h3 className="text-lg font-bold uppercase tracking-wider">Flask Bridge Offline</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
              Browsers block direct communication with local ports for security. You must run the <code>server.py</code> bridge locally to bypass this block.
            </p>
            <div className="bg-black/50 p-6 rounded border border-white/5 space-y-4">
               <p className="text-xs font-bold text-indigo-400 uppercase tracking-tighter">Terminal Execution Sequence:</p>
               <ol className="text-xs text-slate-500 space-y-2 list-decimal pl-4">
                 <li>Ensure Python is installed.</li>
                 <li>Run: <code className="text-white bg-white/5 px-2 py-0.5 rounded select-all">pip install flask flask-cors requests</code></li>
                 <li>Execute: <code className="text-white bg-white/5 px-2 py-0.5 rounded select-all">python server.py</code></li>
                 <li>Once the terminal says "Running", refresh this dashboard.</li>
               </ol>
            </div>
            <button 
              onClick={fetchActivity}
              className="px-8 py-3 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-indigo-500 hover:text-white transition-all active:scale-95"
            >
              Retry Sync (Port 5000)
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Dashboard state={state} onRefresh={fetchActivity} />
            
            {/* Live Terminal */}
            <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-lg">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">System Events</h3>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-white/10"></div>
                    <div className="w-2 h-2 rounded-full bg-white/10"></div>
                  </div>
               </div>
               <div className="space-y-2">
                 {logs.map((log, i) => (
                   <div key={i} className="text-[11px] font-mono flex gap-3 opacity-80 hover:opacity-100 transition-opacity">
                      <span className="text-indigo-500 shrink-0">{" >> "}</span>
                      <span className="text-slate-400">{log}</span>
                   </div>
                 ))}
                 {state.status === ConnectionStatus.CONNECTED && (
                   <div className="text-[11px] font-mono flex gap-3 animate-pulse text-indigo-400">
                     <span className="shrink-0">{" >> "}</span>
                     <span>Monitoring Heartbeats...</span>
                   </div>
                 )}
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <AIRecommendations suggestion={suggestion} loading={loadingSuggestion} />
            
            <div className="bg-indigo-900/10 border border-indigo-500/20 p-8 rounded-lg">
              <h3 className="text-white font-black text-xs uppercase tracking-widest mb-6 border-b border-indigo-500/20 pb-4">
                Health Protocol
              </h3>
              <div className="space-y-6">
                 <div>
                   <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Status</p>
                   <p className={`text-sm font-bold ${state.currentStreak >= 20 ? 'text-rose-500' : 'text-indigo-400'}`}>
                     {state.currentStreak >= 20 ? 'CRITICAL - REST NEEDED' : 'OPERATIONAL'}
                   </p>
                 </div>
                 <div>
                   <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Target</p>
                   <p className="text-sm font-bold text-white">20-20-20 Scientific Method</p>
                 </div>
                 <p className="text-[10px] text-slate-600 leading-relaxed italic">
                    AI analyzes your activity patterns via ActivityWatch to prevent digital eye strain before it begins.
                 </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="pt-12 text-center">
          <p className="text-[8px] font-black tracking-[1em] text-slate-800 uppercase">
            Deep Health Integration • VisionGuard Global
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;