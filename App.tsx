
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityWatchService } from './services/activityWatch.ts';
import { GeminiCoach } from './services/gemini.ts';
import { AppState, ConnectionStatus, BreakSuggestion } from './types.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { AIRecommendations } from './components/AIRecommendations.tsx';

const REFRESH_INTERVAL = 15000; 
const BREAK_THRESHOLD = 20; // 20 minutes for the rule

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
          setState(prev => ({ ...prev, status: ConnectionStatus.CONNECTED, activeApp: 'No Window Data' }));
          return;
        }
      }

      const latestEvent = await ActivityWatchService.getLatestEvent(currentBucket);
      
      if (latestEvent) {
        const eventTime = new Date(latestEvent.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - eventTime.getTime();
        // If the last event was more than 3 minutes ago, consider the user "Away"
        const isActuallyAway = diffMs > (60 * 1000 * 3); 

        setState(prev => {
          const newStreak = isActuallyAway ? 0 : prev.currentStreak + (REFRESH_INTERVAL / 60000);
          const roundedStreak = Math.floor(newStreak);

          // Trigger logic when crossing the 20-minute threshold
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
    // OS Notification
    if (Notification.permission === 'granted') {
      new Notification('VisionGuard: Time for a break!', {
        body: `You've been focused on ${app} for 20 minutes. Follow the 20-20-20 rule!`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966486.png'
      });
    }

    // Audio Alert
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.2;
      audio.play();
    } catch (e) {}

    // AI Insight
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
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3">
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
          <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[2.5rem] space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-4">
              <div className="bg-rose-500/20 p-4 rounded-2xl text-rose-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-white">Network Communication Error</h3>
                <p className="text-rose-300/60 mt-1 leading-relaxed text-sm">
                  The browser is preventing the app from talking to your local ActivityWatch server. This is usually a security or privacy setting.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 space-y-4">
                <h4 className="text-white font-bold text-sm">Most Common Fixes:</h4>
                <ul className="text-xs text-slate-400 space-y-3 list-disc pl-4">
                  <li><b>Brave Browser:</b> Turn off "Shields" for this site. Brave blocks local network requests by default.</li>
                  <li><b>Privacy Extensions:</b> Disable <i>uBlock Origin</i> or similar for this page.</li>
                  <li><b>Private Network Access:</b> Ensure you aren't on <b>HTTPS</b> trying to talk to <b>HTTP</b> localhost.</li>
                </ul>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 flex flex-col justify-center">
                <p className="text-xs text-slate-400 mb-4">Verify if the API is reachable directly:</p>
                <a 
                  href={`${apiHost}/api/0/buckets`} 
                  target="_blank" 
                  className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 p-3 rounded-xl font-mono text-[10px] break-all border border-indigo-500/20 transition-all text-center"
                >
                  Test: {apiHost}/api/0/buckets
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => { setBucketId(null); fetchActivity(); }}
                className="flex-1 py-4 bg-white text-slate-950 font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/10"
              >
                Retry Connection
              </button>
              {isHttps && (
                <a 
                  href={window.location.href.replace('https:', 'http:')}
                  className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-2xl transition-all hover:bg-slate-700 text-center border border-slate-700"
                >
                  Switch to HTTP
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
          
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="text-white font-bold text-lg mb-6">Focus Rules</h3>
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
            
            <p className="text-[11px] text-slate-600 italic leading-relaxed pt-8">
              Protecting your vision by automating ergonomic science.
            </p>
          </div>
        </div>

        <footer className="text-center pb-12 opacity-30">
          <p className="text-[9px] font-black tracking-[0.5em] text-slate-400 uppercase">
            VisionGuard Systems • Local Health Automation
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
