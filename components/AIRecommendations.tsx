
import React from 'react';
import { BreakSuggestion } from '../types';

interface AIRecommendationsProps {
  suggestion: BreakSuggestion | null;
  loading: boolean;
}

export const AIRecommendations: React.FC<AIRecommendationsProps> = ({ suggestion, loading }) => {
  if (!suggestion && !loading) return null;

  return (
    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-500 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="font-bold text-lg text-indigo-300">Coach Gemini's Advice</h3>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          <div className="h-4 bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        </div>
      ) : suggestion ? (
        <div>
          <h4 className="text-white font-semibold text-xl mb-2">{suggestion.title}</h4>
          <p className="text-slate-300 leading-relaxed">{suggestion.instruction}</p>
          <div className="mt-4 flex gap-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-semibold uppercase">
              {suggestion.type} activity
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
