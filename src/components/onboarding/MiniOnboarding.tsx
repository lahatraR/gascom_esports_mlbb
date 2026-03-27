'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ges_mini_onboard_v1';

const STEPS = [
  {
    icon: '📋',
    title: 'Choisissez un archétype',
    body: 'Dans l\'onglet "Strat", sélectionnez votre stratégie (Engage, Poke…). L\'IA génère des compositions complètes adaptées à votre style.',
    hint: 'Conseil : commencez par Engage si vous débutez — c\'est le plus intuitif.',
  },
  {
    icon: '🚫',
    title: 'Bannissez stratégiquement',
    body: 'La barre "MEILLEURS BANS" suggère les héros les plus dangereux à éliminer. Cliquez directement sur un héros pour le bannir.',
    hint: 'Bannissez d\'abord les héros qui contrent votre archétype.',
  },
  {
    icon: '⚔️',
    title: 'Suivez les suggestions',
    body: 'La barre "MEILLEURS PICKS" met à jour ses recommandations à chaque action. Survolez un héros pour voir la simulation What-If.',
    hint: 'Le score 0–100 indique l\'adéquation du héros avec votre stratégie.',
  },
];

export function MiniOnboarding({ currentStep }: { currentStep: number }) {
  const [dismissed, setDismissed] = useState(true);
  const [step, setStep]           = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setDismissed(false);
    } catch { /* localStorage unavailable */ }
  }, []);

  // Auto-advance step based on draft progress
  useEffect(() => {
    if (currentStep === 1) setStep(1);
    if (currentStep >= 4) setStep(2);
  }, [currentStep]);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
  };

  if (dismissed) return null;

  const s = STEPS[step];

  return (
    <div
      className="rounded-xl border px-3 py-2.5 flex items-start gap-3 relative"
      style={{
        background:   'rgba(10,10,25,0.96)',
        border:       '1px solid rgba(139,92,246,0.35)',
        boxShadow:    '0 0 18px rgba(139,92,246,0.10)',
      }}
    >
      {/* Step indicator dots */}
      <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
        <span className="text-xl">{s.icon}</span>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="rounded-full transition-all"
              style={{
                width:      i === step ? 14 : 5,
                height:     5,
                background: i === step ? '#a78bfa' : 'rgba(139,92,246,0.30)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[8px] font-black tracking-widest text-violet-400 uppercase">
            Guide — étape {step + 1}/{STEPS.length}
          </span>
        </div>
        <p className="text-[12px] font-bold text-white leading-snug mb-1">{s.title}</p>
        <p className="text-[11px] text-slate-300 leading-snug mb-1.5">{s.body}</p>
        <p className="text-[10px] text-violet-400 italic leading-snug">💡 {s.hint}</p>
      </div>

      {/* Navigation + close */}
      <div className="shrink-0 flex flex-col gap-1.5 items-end">
        <button
          onClick={dismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors text-[11px] leading-none"
          title="Ne plus afficher"
        >
          ✕
        </button>
        <div className="flex gap-1 mt-auto">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="text-[9px] px-2 py-1 rounded font-bold text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(40,40,60,0.7)' }}
            >
              ‹
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="text-[9px] px-2.5 py-1 rounded font-bold transition-colors"
              style={{ background: 'rgba(139,92,246,0.25)', color: '#a78bfa' }}
            >
              Suivant ›
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="text-[9px] px-2.5 py-1 rounded font-bold transition-colors"
              style={{ background: 'rgba(74,222,128,0.20)', color: '#4ade80' }}
            >
              OK ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
