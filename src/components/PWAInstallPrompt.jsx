import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Shows an install banner when the browser fires beforeinstallprompt (Chrome,
// Edge, Samsung Internet). Lets the user install E-canal Map as a desktop PWA
// on Windows (Start menu / taskbar) or as a home-screen app on Android.
// Dismissed state persists for 7 days so it doesn't nag.
const DISMISS_KEY = "pwa_install_dismissed";
const DISMISS_DAYS = 7;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if dismissed recently
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_DAYS * 86400000) return;
    } catch {}

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[1500] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
            ایپ انسٹال کریں
          </p>
          <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
            E-canal Map کو ڈیسک ٹاپ یا موبائل پر انسٹال کریں — آف لائن بھی چلے گا۔
          </p>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
            >
              انسٹال
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 text-xs"
            >
              بعد میں
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-slate-300 hover:text-slate-500 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}