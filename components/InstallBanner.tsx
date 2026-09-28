'use client';

import { useState, useEffect } from 'react';

const DISMISS_KEY = 'satya_install_dismissed';
const COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if already installed / standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) return;

    // 2. Check 7-day cooldown
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const when = parseInt(dismissed, 10);
        if (Number.isFinite(when) && Date.now() - when < COOLDOWN) {
          return;
        }
      }
    } catch {}

    // 3. Platform detection
    const ua = navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // 4. Capture Chrome / Android PWA beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 5. Let user read the page before prompting (8 seconds delay)
    const timer = setTimeout(() => {
      // Don't show if user is actively in another modal/splash
      if (sessionStorage.getItem('satya_splash_seen') !== 'true') return;
      setVisible(true);
      requestAnimationFrame(() => setEntered(true));
    }, 8000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
    setEntered(false);
    setTimeout(() => setVisible(false), 220);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          handleDismiss();
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Add SatyaDheesh to Home Screen"
      className="fixed z-50 bottom-[68px] sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 sm:w-[360px]"
      style={{
        transform: entered ? 'translateY(0)' : 'translateY(16px)',
        opacity: entered ? 1 : 0,
        transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease',
      }}
    >
      <div
        className="overflow-hidden border rounded-sm shadow-[0_18px_44px_-12px_rgba(26,26,26,0.35)] bg-[var(--surface)]"
        style={{ borderColor: 'var(--border-md)' }}
      >
        {/* Accent stripe */}
        <div className="h-[3px] bg-[var(--accent)]" />

        {/* Edition header */}
        <div className="flex items-center justify-between px-3.5 pt-2 pb-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block"></span>
            <span className="text-[8.5px] font-mono tracking-[0.2em] uppercase text-[var(--text3)]">
              Progressive App
            </span>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="-mr-1 p-1 text-[var(--text3)] hover:text-[var(--text1)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3.5">
          <div className="flex items-start gap-3">
            {/* App Icon Mark */}
            <div
              className="w-10 h-10 rounded-sm border flex items-center justify-center flex-shrink-0 bg-[#FAF8F5] dark:bg-[var(--surface-alt)] shadow-2xs"
              style={{ borderColor: 'var(--border-md)' }}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13.5 3.5l7 7" />
                <path d="M16.5 2l5.5 5.5-3 3L13.5 5z" />
                <path d="M11.5 7l5.5 5.5-7.5 7.5-5.5-5.5z" />
                <path d="M2 22h9" />
              </svg>
            </div>

            <div className="min-w-0">
              <h3 className="font-display font-black text-[15px] leading-tight text-[var(--text1)]">
                Install SatyaDheesh
              </h3>
              <div className="text-[11px] font-serif text-[var(--accent)] mt-0.5 font-bold">
                सत्याधीश — 1-क्लिक एक्सेस
              </div>
            </div>
          </div>

          <p className="text-[12px] leading-relaxed text-[var(--text2)] mt-2.5">
            Add to your Home Screen for instant offline access to election promise verdicts, neta dossiers, and national timelines. Zero ads.
          </p>

          {/* iOS Safari step-by-step instructions */}
          {isIos && showIosGuide && (
            <div className="mt-3 p-2.5 rounded-sm border bg-[var(--surface-alt)] text-[11.5px] text-[var(--text1)] space-y-1.5" style={{ borderColor: 'var(--border)' }}>
              <div className="font-bold text-[10px] font-mono uppercase text-[var(--accent)] tracking-wider">
                How to install on iPhone / iPad:
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[var(--accent)]">1.</span>
                <span>Tap the <strong className="font-semibold">Share</strong> button (⬆) in Safari's toolbar.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[var(--accent)]">2.</span>
                <span>Scroll down and tap <strong className="font-semibold">"Add to Home Screen"</strong> (⊞).</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[var(--accent)]">3.</span>
                <span>Confirm name <strong className="font-semibold">SatyaDheesh</strong> and tap <strong className="font-semibold">Add</strong>.</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3.5 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 h-8 px-3 text-[11px] font-mono font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5 shadow-xs"
              style={{ background: 'var(--accent)' }}
            >
              <span>📲</span>
              <span>{isIos ? (showIosGuide ? 'Got It' : 'Add to Home Screen') : 'Install SatyaDheesh'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="h-8 px-3 text-[11px] font-mono uppercase tracking-wider text-[var(--text3)] hover:text-[var(--text1)] transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
