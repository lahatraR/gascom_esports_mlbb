'use client';

import { useState, useRef } from 'react';

/**
 * Educational hover tooltip — wraps any element and shows a text bubble on hover.
 * Used to explain archetypes, lane names, and other game concepts to new players.
 */
export function InfoTooltip({
  content,
  children,
  position = 'top',
}: {
  content:   string;
  children:  React.ReactNode;
  position?: 'top' | 'bottom' | 'right';
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), 180);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  const placement =
    position === 'bottom' ? 'top-full mt-1.5 left-1/2 -translate-x-1/2'
    : position === 'right' ? 'left-full ml-1.5 top-1/2 -translate-y-1/2'
    : 'bottom-full mb-1.5 left-1/2 -translate-x-1/2';

  return (
    <span
      className="relative inline-flex items-center cursor-help"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          className={`absolute z-50 w-52 rounded-lg px-2.5 py-2 text-[11px] leading-snug text-slate-200 pointer-events-none shadow-xl ${placement}`}
          style={{
            background:   'rgba(10,10,20,0.97)',
            border:       '1px solid rgba(100,100,150,0.45)',
            boxShadow:    '0 4px 20px rgba(0,0,0,0.6)',
            whiteSpace:   'normal',
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
