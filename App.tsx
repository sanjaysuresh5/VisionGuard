
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
          setState(prev => ({ ...prev, status: ConnectionStatus.ERROR }));
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

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">VisionGuard</h1>
              <p className="text-slate-500 text-sm font-medium">ActivityWatch Intelligence</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
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
          <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[2rem] space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-rose-500/20 p-3 rounded-xl text-rose-500 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-rose-400">Connection Interrupted</h3>
                <p className="text-rose-300/70 mt-1 leading-relaxed">
                  The local ActivityWatch service could not be reached.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border ${isHttps ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs">1</span>
                  Protocol Security
                </h4>
                <div className="text-sm text-slate-400 leading-relaxed">
                  {isHttps ? (
                    <>
                      You are using <b className="text-amber-400">HTTPS</b>. Browsers block secure sites from talking to local HTTP.
                      <br/><br/>
                      <a href={window.location.href.replace('https:', 'http:')} className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors">
                        Switch to HTTP
                      </a>
                    </>
                  ) : (
                    "Using HTTP (Correct for localhost)."
                  )}
                </div>
              </div>

              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs">2</span>
                  Service Check
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Open your terminal and ensure ActivityWatch is running, or visit 
                  <a href="http://localhost:5600" target="_blank" className="text-indigo-400 ml-1 hover:underline font-bold">http://localhost:5600</a>.
                </p>
              </div>
            </div>

            <button 
              onClick={() => { setBucketId(null); fetchActivity(); }}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all border border-slate-700 active:scale-[0.98]"
            >
              Retry Sync
            </button>
          </div>
        )}

        <Dashboard state={state} onRefresh={() => { setBucketId(null); fetchActivity(); }} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <AIRecommendations suggestion={suggestion} loading={loadingSuggestion} />
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] space-y-6">
            <h3 className="text-white font-bold text-lg">Health Protocol</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Target Interval</span>
                <span className="text-slate-200 font-mono bg-slate-800 px-2 py-0.5 rounded">20:00</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Rest Duration</span>
                <span className="text-slate-200 font-mono bg-slate-800 px-2 py-0.5 rounded">00:20</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
