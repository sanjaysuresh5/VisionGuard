
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityWatchService } from './services/activityWatch.ts';
import { GeminiCoach } from './services/gemini.ts';
import { AppState, ConnectionStatus, BreakSuggestion } from './types.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { AIRecommendations } from './components/AIRecommendations.tsx';

const REFRESH_INTERVAL = 15000; 
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
  const [bucketId, setBucketId] = useState<string | null>(null);
  const [manualJson, setManualJson] = useState('');

  const handleManualSync = () => {
    try {
      const parsed = JSON.parse(manualJson);
      ActivityWatchService.setManualBuckets(parsed);
      setBucketId(null);
      fetchActivity();
      setManualJson('');
    } catch (e) {
      alert("Invalid JSON format. Please paste the full output from the ActivityWatch API link.");
    }
  };

  const fetchActivity = useCallback(async () => {
    try {
      let currentBucket = bucketId;
      
      if (!currentBucket) {
        setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTING }));
        currentBucket = await ActivityWatchService.findWindowBucket();
        if (currentBucket) {
          setBucketId(currentBucket);
        } else {
          setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTED, activeApp: 'Waiting for Activity...' }));
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
      new Notification('VisionGuard: Time for a break!', {
        body: `You've been focused on ${app} for 20 minutes. Look away!`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966486.png'
      });
    }

    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.2;
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
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3 transition-transform hover:rotate-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none">VisionGuard</h1>
              <p className="text-slate-500 text-sm font-medium mt-1 tracking-wide">ActivityWatch Intelligence</p>
            </div>
          </div>
          
          <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 transition-all ${
            state.status === ConnectionStatus.CONNECTED 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : state.status === ConnectionStatus.CONNECTING
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${state.status === ConnectionStatus.CONNECTED ? 'bg-emerald-500 animate-pulse' : 'bg-current'}`}></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]">
              {state.status.toLowerCase()}
            </span>
          </div>
        </header>

        {state.status === ConnectionStatus.ERROR && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] space-y-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start gap-5">
              <div className="bg-rose-500/10 p-4 rounded-2xl text-rose-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-2xl text-white">Security Block Detected</h3>
                <p className="text-slate-400 mt-2 leading-relaxed">
                  Browsers often block web apps from talking to local software (localhost) for safety. You can bypass this by bridging the data manually.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px]">1</span>
                  Get the Data
                </div>
                <p className="text-xs text-slate-500">Open the link below and copy everything you see (the JSON text):</p>
                <a 
                  href={`${apiHost}/api/0/buckets`} 
                  target="_blank" 
                  className="block p-4 bg-slate-950 border border-slate-800 rounded-xl text-indigo-400 font-mono text-xs hover:border-indigo-500/50 transition-colors break-all"
                >
                  {apiHost}/api/0/buckets
                </a>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px]">2</span>
                  Bridge the Gap
                </div>
                <textarea 
                  value={manualJson}
                  onChange={(e) => setManualJson(e.target.value)}
                  placeholder="Paste the JSON output here..."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 focus:border-indigo-500 outline-none transition-colors resize-none"
                />
                <button 
                  onClick={handleManualSync}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                >
                  Manual Sync & Fix
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
               <p className="text-[10px] text-slate-600 max-w-sm">
                Pro tip: If using Brave, turning off "Shields" for this site usually allows the automatic sync to work instantly.
               </p>
               <button 
                onClick={() => { setBucketId(null); fetchActivity(); }}
                className="text-slate-400 hover:text-white text-xs font-bold underline decoration-slate-800"
               >
                Retry Auto-Sync
               </button>
            </div>
          </div>
        )}

        <Dashboard state={state} onRefresh={() => { setBucketId(null); fetchActivity(); }} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <AIRecommendations suggestion={suggestion} loading={loadingSuggestion} />
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                 <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                 Protocol
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Interval</span>
                  <span className="text-slate-200 font-mono bg-slate-800 px-3 py-1 rounded-lg">20m</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Rest</span>
                  <span className="text-slate-200 font-mono bg-slate-800 px-3 py-1 rounded-lg">20s</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Distance</span>
                  <span className="text-slate-200 font-mono bg-slate-800 px-3 py-1 rounded-lg">20ft+</span>
                </div>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-600 italic leading-relaxed pt-8 border-t border-slate-800/50 mt-4">
              VisionGuard uses ActivityWatch heartbeats to monitor your ocular health in real-time.
            </p>
          </div>
        </div>

        <footer className="text-center pb-12">
          <p className="text-[9px] font-black tracking-[0.5em] text-slate-800 uppercase">
            VisionGuard Engine • Enterprise Health Analytics
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
