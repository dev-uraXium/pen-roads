import confetti from 'canvas-confetti';
import { Award, CheckCircle, Clock, DollarSign, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import React, { useEffect } from 'react';
import { JobResult } from '../types/game';

interface JobCompleteModalProps {
  result: JobResult;
  onContinue: () => void;
  onNextJob: () => void;
}

export const JobCompleteModal: React.FC<JobCompleteModalProps> = ({
  result,
  onContinue,
  onNextJob,
}) => {
  useEffect(() => {
    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#22c55e', '#f59e0b', '#ec4899'],
      });
    } catch {
      // Ignore
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 text-white">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Contract Completed!</h2>
          <p className="text-xs text-slate-400">{result.job.title}</p>
        </div>

        {/* Payout Breakdown Card */}
        <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Duration
            </span>
            <span className="font-mono text-slate-200">{result.timeTakenFormatted}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Base Contract Payment</span>
              <span className="font-mono tabular-nums text-slate-200">+${result.baseReward}</span>
            </div>

            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Safety & Condition Bonus
              </span>
              <span className="font-mono tabular-nums">+${result.safetyBonus}</span>
            </div>

            <div className="flex items-center justify-between text-sky-400">
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                Weather Condition Bonus
              </span>
              <span className="font-mono tabular-nums">+${result.weatherBonus}</span>
            </div>

            {result.penalties > 0 && (
              <div className="flex items-center justify-between text-rose-400">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Collision Penalties
                </span>
                <span className="font-mono tabular-nums">-${result.penalties}</span>
              </div>
            )}
          </div>

          {/* Total Net Reward */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="font-bold text-sm text-white">Total Payout</span>
            <span className="font-mono font-extrabold text-2xl text-emerald-400">
              +${result.finalReward}
            </span>
          </div>
        </div>

        {/* Reputation Gain */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-sky-950/40 border border-sky-500/20 text-xs">
          <div className="flex items-center gap-2 text-sky-300">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span>Driver Reputation XP</span>
          </div>
          <span className="font-mono font-bold text-sky-400">+{result.reputationGained} XP</span>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onContinue}
            className="py-3 px-4 rounded-xl border border-white/10 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
          >
            Free Drive
          </button>

          <button
            onClick={onNextJob}
            className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/25"
          >
            Accept New Job
          </button>
        </div>
      </div>
    </div>
  );
};
