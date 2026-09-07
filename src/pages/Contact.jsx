import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Thank you — your message has been received. We'll get back to you shortly.");
      setName("");
      setEmail("");
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100">
      <header className="border-b border-white/10 bg-[#0f1923]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="font-heading font-bold tracking-wide">ChakLand GIS PRO</div>
          <Link to="/login" className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-3xl font-bold font-heading">Contact Us</h1>
        <p className="text-slate-300 leading-relaxed">
          Questions, feedback, or support requests? Reach the Canal E Record team using the form below
          or email us at{" "}
          <a
            href="mailto:support@canalerecord.example"
            className="text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <Mail className="w-4 h-4" /> support@canalerecord.example
          </a>
          .
        </p>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-[#0f1923] border border-white/10 rounded-xl p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11"
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="How can we help?"
            />
          </div>
          <Button type="submit" disabled={sending} className="w-full h-11">
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Send message
              </>
            )}
          </Button>
        </form>
      </main>
      <footer className="border-t border-white/10 bg-[#0f1923]">
        <div className="max-w-3xl mx-auto px-6 h-12 flex items-center gap-4 text-sm text-slate-400">
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/login" className="hover:text-white">Log in</Link>
        </div>
      </footer>
    </div>
  );
}