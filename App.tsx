
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityWatchService } from './services/activityWatch.ts';
import { GeminiCoach } from './services/gemini.ts';
import { AppState, ConnectionStatus, BreakSuggestion } from './types.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { AIRecommendations } from './components/AIRecommendations.tsx';

const REFRESH_INTERVAL = 15000; 
const BREAK_THRESHOLD = 20; // minutes

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
  const [bucketId, setBucketId] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      let currentBucket = bucketId;
      
      if (!currentBucket) {
        setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTING }));
        currentBucket = await ActivityWatchService.findWindowBucket();
        if (currentBucket) {
          setBucketId(currentBucket);
        } else {
          // Connected to AW but no bucket found
          setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTED, activeApp: 'No Window Bucket Found' }));
          return;
        }
      }

      const latestEvent = await ActivityWatchService.getLatestEvent(currentBucket);
      
      if (latestEvent) {
        const eventTime = new Date(latestEvent.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - eventTime.getTime();
        const isActuallyAway = diffMs > (60 * 1000 * 3); 

        setState(prev => {
          const newStreak = isActuallyAway ? 0 : prev.currentStreak + (REFRESH_INTERVAL / 60000);
          const roundedStreak = Math.floor(newStreak);

          if (roundedStreak >= BREAK_THRESHOLD && prev.currentStreak < BREAK_THRESHOLD) {
            triggerBreak(latestEvent.data.app);
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
      console.error("VisionGuard Sync Error:", e);
      setState(prev => ({ ...prev, status: ConnectionStatus.ERROR }));
    }
  }, [bucketId]);

  const triggerBreak = async (app: string) => {
    if (Notification.permission === 'granted') {
      new Notification('VisionGuard: 20-20-20 Rule', {
        body: `You've been using ${app} for 20 minutes. Look 20ft away for 20s.`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966486.png'
      });
    }

    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.3;
      audio.play();
    } catch (e) {}

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

  const isHttps = window.location.protocol === 'https:';
  const apiHost = ActivityWatchService.getActiveHost();

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex justify-center selection:bg-indigo-500/30">
      <div className="w-full max-w-4xl space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3 transition-transform hover:rotate-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">VisionGuard</h1>
              <p className="text-slate-500 text-sm font-medium tracking-wide">ActivityWatch Intelligence</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${
              state.status === ConnectionStatus.CONNECTED 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : state.status === ConnectionStatus.CONNECTING
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${state.status === ConnectionStatus.CONNECTED ? 'bg-emerald-500 animate-pulse' : 'bg-current'}`}></span>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {state.status.toLowerCase()}
              </span>
            </div>
          </div>
        </header>

        {state.status === ConnectionStatus.ERROR && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-rose-500/20 p-3 rounded-xl text-rose-500 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-rose-400">Connection Failed (NetworkError)</h3>
                <p className="text-rose-300/70 mt-1 leading-relaxed">
                  The browser blocked the connection to ActivityWatch. This is common when different ports or security tools are involved.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-3">
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 text-xs">1</span>
                  Check Privacy Tools
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your browser extensions (like <b>uBlock Origin</b> or <b>Privacy Badger</b>) might be blocking requests to <code>localhost</code>. 
                  <br/><br/>
                  Try disabling them for this page and refresh.
                </p>
              </div>

              <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-3">
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 text-xs">2</span>
                  Verify API Access
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Open this link in a new tab. If you see JSON text, the server is working:
                  <a 
                    href={`${apiHost}/api/0/buckets`} 
                    target="_blank" 
                    className="block mt-2 text-indigo-400 hover:text-indigo-300 font-mono bg-indigo-500/10 p-2 rounded truncate transition-colors"
                  >
                    {apiHost}/api/0/buckets
                  </a>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => { setBucketId(null); fetchActivity(); }}
                className="flex-1 py-4 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-500/20 active:scale-[0.98]"
              >
                Retry Connection
              </button>
              {isHttps && (
                <a 
                  href={window.location.href.replace('https:', 'http:')}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all border border-slate-700 text-center"
                >
                  Switch to HTTP Mode
                </a>
              )}
            </div>
          </div>
        )}

        <Dashboard state={state} onRefresh={() => { setBucketId(null); fetchActivity(); }} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <AIRecommendations suggestion={suggestion} loading={loadingSuggestion} />
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] space-y-6 shadow-xl relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Health Protocol
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm group">
                <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Target Interval</span>
                <span className="text-slate-200 font-mono bg-slate-800 px-3 py-1 rounded-lg">20:00</span>
              </div>
              <div className="flex justify-between items-center text-sm group">
                <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Rest Duration</span>
                <span className="text-slate-200 font-mono bg-slate-800 px-3 py-1 rounded-lg">00:20</span>
              </div>
              <div className="flex justify-between items-center text-sm group">
                <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Distance</span>
                <span className="text-slate-200 font-mono bg-slate-800 px-3 py-1 rounded-lg">20+ ft</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic leading-relaxed pt-4 border-t border-slate-800/50">
              ActivityWatch tracks your focus, VisionGuard protects your eyes. Automating health habits one heartbeat at a time.
            </p>
          </div>
        </div>

        <footer className="text-center pb-8 pt-4">
          <p className="text-slate-800 text-[10px] font-black tracking-[0.3em] uppercase">
            VisionGuard Engine • Distributed Health Intelligence
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
