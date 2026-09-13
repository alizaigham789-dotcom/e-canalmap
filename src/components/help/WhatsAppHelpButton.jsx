import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import WhatsAppHelpChat from "@/components/help/WhatsAppHelpChat";

// Floating Help button — opens an in-app chat with the app admin (WhatsApp
// number hidden). Renders on the Dashboard for authenticated users.
export default function WhatsAppHelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[1100] flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition-colors tap-target"
        title="مدد / Help"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-bold">مدد / Help</span>
      </button>
      <WhatsAppHelpChat open={open} onClose={() => setOpen(false)} />
    </>
  );
}