'use client';

import { useState, useEffect } from 'react';

// ─── Slide definitions ─────────────────────────────────────────────────────────

interface Slide {
  icon:        string;
  title:       string;
  body:        React.ReactNode;
  highlight?:  string; // optional label pointing to a UI area
}

const SLIDES: Slide[] = [
  {
    icon:  '🎮',
    title: "C'est quoi GES Draft Simulator ?",
    body: (
      <>
        <p>
          Un outil professionnel pour préparer vos drafts <strong>Mobile Legends: Bang Bang</strong>.
          Il vous aide à choisir les bons héros, analyser la stratégie ennemie en temps réel, et
          construire des compositions optimales.
        </p>
        <p className="mt-2 text-slate-400">
          Ce guide rapide vous montre comment naviguer sur le site en moins de 2 minutes.
        </p>
      </>
    ),
  },
  {
    icon:  '🏠',
    title: 'Étape 1 — Choisissez votre mode',
    body: (
      <>
        <p>Sur la page d&apos;accueil, choisissez votre mode de jeu :</p>
        <ul className="mt-2 space-y-1.5 text-slate-300">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">🎮</span>
            <span><strong>Custom</strong> — simulation libre entre équipes, sans contraintes.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">🏆</span>
            <span><strong>Ranked</strong> — format standard classé (5 bans par équipe).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">⚔️</span>
            <span><strong>Tournament</strong> — draft compétitif pro (6 bans, séquence officielle).</span>
          </li>
        </ul>
      </>
    ),
    highlight: 'Les 3 cartes de mode sur la page d\'accueil',
  },
  {
    icon:  '🎯',
    title: 'Étape 2 — Votre côté et stratégie',
    body: (
      <>
        <p>Après avoir choisi le mode, deux questions vous sont posées :</p>
        <ul className="mt-2 space-y-1.5 text-slate-300">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">🔵🔴</span>
            <span><strong>Côté Bleu ou Rouge</strong> — chaque côté a un ordre de pick différent. Le bleu pick en premier, le rouge a le dernier pick.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">📋</span>
            <span><strong>Votre archetype</strong> — Engage, Poke, Protect, Split ou Catch. Ou choisissez "Draft libre" si vous n'avez pas de plan fixe.</span>
          </li>
        </ul>
      </>
    ),
  },
  {
    icon:  '⚔️',
    title: 'Étape 3 — Le Draft Board',
    body: (
      <>
        <p>Le tableau de draft s&apos;ouvre. La séquence se déroule automatiquement :</p>
        <ul className="mt-2 space-y-1.5 text-slate-300">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">🚫</span>
            <span><strong>Phase de BAN</strong> — cliquez sur un héros pour le bannir. Il sera indisponible pour les deux équipes.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">✅</span>
            <span><strong>Phase de PICK</strong> — cliquez pour sélectionner un héros pour votre équipe.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">↩️</span>
            <span><strong>Bouton Annuler</strong> (en haut) — défait la dernière action si vous vous êtes trompé.</span>
          </li>
        </ul>
        <p className="mt-2 text-slate-500 text-[11px]">
          L&apos;équipe active et l&apos;action en cours sont affichées en temps réel en haut de l&apos;écran.
        </p>
      </>
    ),
  },
  {
    icon:  '💡',
    title: 'Étape 4 — Les Suggestions IA',
    body: (
      <>
        <p>
          En haut du sélecteur de héros, <strong>3 portraits apparaissent automatiquement</strong> :
          ce sont les meilleurs picks recommandés pour le slot actuel.
        </p>
        <ul className="mt-2 space-y-1.5 text-slate-300">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">🎯</span>
            <span>Ils s&apos;adaptent à votre <strong>archetype choisi</strong> (Engage, Poke…)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">⚔️</span>
            <span>Ils tiennent compte des <strong>picks ennemis confirmés</strong> pour counter automatiquement.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">🏷️</span>
            <span>Survolez un portrait pour voir ses <strong>stats clés</strong> (CC, Dégâts, Mobilité, Résistance).</span>
          </li>
        </ul>
      </>
    ),
    highlight: 'Barre de 3 portraits en haut du sélecteur de héros',
  },
  {
    icon:  '🔍',
    title: "Étape 5 — L'onglet Déduction",
    body: (
      <>
        <p>
          Dans les onglets d&apos;analyse à droite (ou en bas sur mobile), cliquez sur <strong>"Déduction"</strong>.
        </p>
        <p className="mt-2 text-slate-300">Cet onglet analyse les bans et picks ennemis en temps réel pour :</p>
        <ul className="mt-1.5 space-y-1 text-slate-300">
          <li className="flex items-start gap-2">
            <span>📊</span>
            <span>Déduire leur <strong>stratégie probable</strong> (Engage ? Protect ? Catch ?)</span>
          </li>
          <li className="flex items-start gap-2">
            <span>🚫</span>
            <span>Vous dire <strong>quoi bannir en priorité</strong> selon leurs picks confirmés</span>
          </li>
          <li className="flex items-start gap-2">
            <span>🎯</span>
            <span>Donner des <strong>conseils de counterplay</strong> spécifiques à leurs héros</span>
          </li>
        </ul>
      </>
    ),
    highlight: 'Onglet "Déduction" dans le panneau d\'analyse',
  },
  {
    icon:  '📋',
    title: "Étape 6 — L'onglet Stratégie",
    body: (
      <>
        <p>
          L&apos;onglet <strong>"Stratégie"</strong> génère automatiquement les meilleures compositions
          pour votre archetype choisi.
        </p>
        <p className="mt-2 text-slate-300">Chaque composition affiche :</p>
        <ul className="mt-1.5 space-y-1 text-slate-300">
          <li className="flex items-start gap-2"><span>🧩</span><span>Le <strong>meilleur héros par lane</strong> avec ses alternatives si banni</span></li>
          <li className="flex items-start gap-2"><span>🎯</span><span>L&apos;<strong>ordre de pick recommandé</strong> (1er, 2ème… jusqu&apos;au 5ème pick)</span></li>
          <li className="flex items-start gap-2"><span>🔗</span><span>Les <strong>combos clés</strong> entre héros (CC chain, Engage+Burst…)</span></li>
          <li className="flex items-start gap-2"><span>🚫</span><span>Les <strong>bans à prioriser</strong> pour protéger votre composition</span></li>
          <li className="flex items-start gap-2"><span>📋</span><span>Un <strong>bouton Copier</strong> pour partager le résumé sur Discord/WhatsApp</span></li>
        </ul>
      </>
    ),
  },
  {
    icon:  '🚀',
    title: "Vous êtes prêt !",
    body: (
      <>
        <p className="text-slate-300 leading-relaxed">
          Vous connaissez maintenant toutes les fonctionnalités principales.
          L&apos;outil s&apos;adapte en temps réel à chaque ban et pick — plus vous avancez dans le draft,
          plus les analyses deviennent précises.
        </p>
        <div
          className="mt-3 rounded-xl p-3 flex items-start gap-2"
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}
        >
          <span className="text-emerald-400 text-base shrink-0">✓</span>
          <p className="text-[11px] text-emerald-300/80 leading-snug">
            <strong>Conseil pro :</strong> Choisissez le mode Tournoi, côté Bleu, et archetype Engage
            pour commencer à explorer les compositions. L&apos;IA fait le reste.
          </p>
        </div>
      </>
    ),
  },
];

const STORAGE_KEY = 'ges_onboarding_v1';

// ─── Step dots ─────────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width:      i === current ? 16 : 6,
            height:     6,
            background: i === current
              ? 'rgba(220,80,50,0.9)'
              : i < current
              ? 'rgba(220,80,50,0.35)'
              : 'rgba(80,80,100,0.4)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function OnboardingOverlay() {
  // 'idle' = not yet determined (SSR safe)
  // 'ask'  = show "Nouveau ou déjà utilisé?" question
  // 'tour' = show step-by-step slides
  // 'done' = hidden
  const [state, setState] = useState<'idle' | 'ask' | 'tour' | 'done'>('idle');
  const [step,  setStep]  = useState(0);

  // Check localStorage on mount (client only)
  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      setState(seen ? 'done' : 'ask');
    } catch {
      setState('done'); // storage denied → skip onboarding
    }
  }, []);

  function markDone() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setState('done');
  }

  function handleIsNew() {
    setState('tour');
    setStep(0);
  }

  function handleIsReturning() {
    markDone();
  }

  function handleNext() {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      markDone();
    }
  }

  function handlePrev() {
    if (step > 0) setStep(step - 1);
  }

  function handleSkip() {
    markDone();
  }

  if (state === 'idle' || state === 'done') return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
    >
      {/* ── Welcome question ── */}
      {state === 'ask' && (
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden animate-fade-in"
          style={{ background: 'rgba(10,6,20,0.98)', border: '1px solid rgba(200,70,40,0.40)', boxShadow: '0 0 60px rgba(150,30,15,0.35)' }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 flex flex-col items-center gap-3 text-center"
            style={{ background: 'rgba(180,50,25,0.12)', borderBottom: '1px solid rgba(180,50,25,0.25)' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
              style={{ background: 'rgba(180,50,25,0.18)', border: '1px solid rgba(200,70,40,0.35)' }}
            >
              👋
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide">Bienvenue sur GES Draft</h2>
              <p className="text-[11px] text-slate-400 mt-1">Outil de draft Mobile Legends par Gascom Esports</p>
            </div>
          </div>

          {/* Question */}
          <div className="px-6 py-5 text-center">
            <p className="text-[13px] text-slate-200 leading-relaxed">
              Est-ce votre <strong className="text-white">première fois</strong> sur ce site ?
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Si oui, on vous guide pas à pas pour tout comprendre.
            </p>
          </div>

          {/* Buttons */}
          <div className="px-6 pb-6 flex flex-col gap-2.5">
            <button
              onClick={handleIsNew}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95"
              style={{ background: 'rgba(200,60,30,0.85)', color: '#fff', border: '1px solid rgba(220,80,40,0.60)' }}
            >
              ✨ Oui, je suis nouveau — guidez-moi !
            </button>
            <button
              onClick={handleIsReturning}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
              style={{ background: 'rgba(30,30,50,0.7)', color: '#94a3b8', border: '1px solid rgba(60,60,90,0.50)' }}
            >
              Non, j&apos;ai déjà utilisé le site
            </button>
          </div>
        </div>
      )}

      {/* ── Step-by-step tour ── */}
      {state === 'tour' && (
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: 'rgba(10,6,20,0.98)', border: '1px solid rgba(200,70,40,0.35)', boxShadow: '0 0 60px rgba(150,30,15,0.30)' }}
        >
          {/* Progress header */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ background: 'rgba(180,50,25,0.10)', borderBottom: '1px solid rgba(180,50,25,0.20)' }}
          >
            <StepDots total={SLIDES.length} current={step} />
            <span className="text-[10px] text-slate-500 font-medium">
              {step + 1} / {SLIDES.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
            >
              Passer ✕
            </button>
          </div>

          {/* Slide content */}
          <div className="px-6 py-5">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(180,50,25,0.15)', border: '1px solid rgba(200,70,40,0.30)' }}
              >
                {SLIDES[step].icon}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-base font-black text-white text-center mb-3 leading-tight">
              {SLIDES[step].title}
            </h3>

            {/* Body */}
            <div className="text-[12px] text-slate-300 leading-relaxed">
              {SLIDES[step].body}
            </div>

            {/* Highlight hint */}
            {SLIDES[step].highlight && (
              <div
                className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.20)' }}
              >
                <span className="text-yellow-400 text-xs shrink-0">👆</span>
                <p className="text-[10px] text-yellow-300/70 leading-snug">{SLIDES[step].highlight}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 pb-5 flex items-center gap-3">
            {step > 0 ? (
              <button
                onClick={handlePrev}
                className="px-4 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 active:scale-95"
                style={{ background: 'rgba(30,30,50,0.8)', color: '#64748b', border: '1px solid rgba(60,60,90,0.50)' }}
              >
                ← Précédent
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95"
              style={{
                background: step === SLIDES.length - 1
                  ? 'rgba(74,222,128,0.20)'
                  : 'rgba(200,60,30,0.85)',
                color: step === SLIDES.length - 1 ? '#4ade80' : '#fff',
                border: step === SLIDES.length - 1
                  ? '1px solid rgba(74,222,128,0.40)'
                  : '1px solid rgba(220,80,40,0.60)',
              }}
            >
              {step === SLIDES.length - 1 ? '🚀 Commencer le draft !' : 'Suivant →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
