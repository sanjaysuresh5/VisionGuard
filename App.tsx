
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityWatchService } from './services/activityWatch';
import { GeminiCoach } from './services/gemini';
import { AppState, ConnectionStatus, BreakSuggestion } from './types';
import { Dashboard } from './components/Dashboard';
import { AIRecommendations } from './components/AIRecommendations';

const REFRESH_INTERVAL = 30000; // 30 seconds
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
  const [errorType, setErrorType] = useState<'NONE' | 'CORS' | 'OFFLINE'>('NONE');

  const fetchActivity = useCallback(async () => {
    let currentBucket = bucketId;
    
    try {
      if (!currentBucket) {
        setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTING }));
        currentBucket = await ActivityWatchService.findWindowBucket();
        if (currentBucket) {
          setBucketId(currentBucket);
          setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTED }));
          setErrorType('NONE');
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
        const isActuallyAway = diffMs > (60 * 1000 * 5); // 5 mins idle

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
      console.error("Fetch error details:", e);
      setState(prev => ({ ...prev, status: ConnectionStatus.ERROR }));
      
      // Heuristic to detect CORS/Mixed Content vs just being offline
      if (window.location.protocol === 'https:') {
        setErrorType('CORS'); // Likely Mixed Content block
      } else {
        setErrorType('OFFLINE');
      }
    }
  }, [bucketId]);

  const triggerBreak = async (app: string) => {
    if (Notification.permission === 'granted') {
      new Notification('20-20-20 Rule Alert!', {
        body: 'Time to look away! Give your eyes a 20-second break.',
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966486.png'
      });
    }

    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.4;
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

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex justify-center selection:bg-indigo-500/30">
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
              <div className="bg-rose-500/20 p-3 rounded-xl text-rose-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-xl text-rose-400">Connection Failed</h3>
                <p className="text-rose-300/70 mt-1 leading-relaxed">
                  We can't talk to ActivityWatch on <code className="bg-black/30 px-1 rounded">localhost:5600</code>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs">1</span>
                  Is ActivityWatch running?
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Make sure the ActivityWatch application is open on your computer. Visit 
                  <a href="http://localhost:5600" target="_blank" className="text-indigo-400 ml-1 hover:underline">localhost:5600</a> 
                  to check manually.
                </p>
              </div>

              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs">2</span>
                  Mixed Content / CORS
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Browsers block <code className="text-rose-400">https</code> sites from calling <code className="text-rose-400">http</code> localhost. 
                  Try running this app on <b>http</b> or use a CORS-bypass extension.
                </p>
              </div>
            </div>

            <button 
              onClick={() => { setBucketId(null); fetchActivity(); }}
              className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-500/20 active:scale-[0.98]"
            >
              Retry Connection
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
              <div className="flex justify-between items-center text-sm group">
                <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Target Interval</span>
                <span className="text-slate-200 font-mono bg-slate-800 px-2 py-0.5 rounded">20:00</span>
              </div>
              <div className="flex justify-between items-center text-sm group">
                <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Rest Duration</span>
                <span className="text-slate-200 font-mono bg-slate-800 px-2 py-0.5 rounded">00:20</span>
              </div>
              <div className="flex justify-between items-center text-sm group">
                <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Visual Depth</span>
                <span className="text-slate-200 font-mono bg-slate-800 px-2 py-0.5 rounded">20+ ft</span>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800">
               <div className="flex gap-3 items-start">
                 <div className="mt-1 text-indigo-500">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                   </svg>
                 </div>
                 <p className="text-[11px] text-slate-500 leading-relaxed italic">
                  Digital eye strain is real. This app helps you prevent CVS (Computer Vision Syndrome) by automating your break reminders.
                 </p>
               </div>
            </div>
          </div>
        </div>

        <footer className="text-center pb-8">
          <p className="text-slate-700 text-xs font-medium tracking-widest uppercase">
            VisionGuard Engine • Secure Local Processing
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
