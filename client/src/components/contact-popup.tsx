import { useState } from "react";
import { X, MessageCircle, Mail, Clock, Send, Sparkles } from "lucide-react";

const AUTO_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["refund", "money back", "return", "reimburse"],
    response: "We totally understand 💛 Instead of a refund, we'd love to personally find you an even better deal. For direct assistance, reach us at elitedealshub.edh@gmail.com — include a quick description and we'll make it right! 🎯",
  },
  {
    keywords: ["scam", "fake", "fraud", "not real", "doesn't work"],
    response: "Your trust means the world to us 🙏 Every deal we list is personally verified. Please reach out directly at elitedealshub.edh@gmail.com with details of what happened — we investigate every report and respond personally. ✅",
  },
  {
    keywords: ["broken", "error", "bug", "not working", "issue", "problem", "glitch"],
    response: "Ugh, tech gremlins! 😤 Please email us at elitedealshub.edh@gmail.com with what happened and your device type — we'll get it sorted fast. Try a quick refresh in the meantime! ⚡",
  },
  {
    keywords: ["cancel", "unsubscribe", "stop", "remove"],
    response: "Totally respect that! 💙 You're always in full control here. For anything specific, reach us at elitedealshub.edh@gmail.com — we'll handle it personally and promptly. 🌟",
  },
  {
    keywords: ["help", "how", "what", "where", "explain"],
    response: "Happy to help! 🙌 Browse deals on the main page, tap 'Get This Deal Now' to grab any offer, or use the AI chatbot for personalised picks. For anything else, email us directly at elitedealshub.edh@gmail.com 😊",
  },
];

const DEFAULT_RESPONSE =
  "Thanks for reaching out! 💌 Please email us directly at elitedealshub.edh@gmail.com — we read and personally respond to every message. Include any details so we can help you faster!";

function getAutoResponse(message: string): string | null {
  const lower = message.toLowerCase();
  for (const entry of AUTO_RESPONSES) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.response;
  }
  return null;
}

export default function ContactPopup() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [autoReply, setAutoReply] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    const deviceId = localStorage.getItem("deviceId") || undefined;
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, message: message.trim(), deviceId }),
      });
    } catch {
      // non-blocking
    }
    const reply = getAutoResponse(message);
    setAutoReply(reply || DEFAULT_RESPONSE);
    setSubmitted(true);
    setSending(false);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setAutoReply(null);
      setName("");
      setMessage("");
    }, 300);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:scale-105"
        style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", cursor: "pointer" }}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Contact Us
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "#0d0f1a",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
              animation: "slideUp 0.25s ease",
            }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#a78bfa" }} />
                <span className="font-bold text-white text-sm">Talk to Us 💬</span>
              </div>
              <button onClick={handleClose} className="rounded-full p-1 hover:bg-white/10 transition-colors" style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />
                <div>
                  <div className="text-xs font-semibold" style={{ color: "#4ade80" }}>We're here for you</div>
                  <div className="text-xs" style={{ color: "#6b7280" }}>Reach us any time ✨</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
                <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#60a5fa" }} />
                <span>elitedealshub.edh@gmail.com</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
                <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#a78bfa" }} />
                <span>Mon–Sun · Response within 24 hrs</span>
              </div>

              {!submitted ? (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e5e7eb" }}
                  />
                  <textarea
                    placeholder="What's on your mind? Ask anything — deals, issues, ideas... 🚀"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-xl outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e5e7eb" }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || sending}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", cursor: message.trim() ? "pointer" : "not-allowed", opacity: message.trim() ? 1 : 0.5 }}
                  >
                    {sending ? "Sending..." : <><Send className="w-3.5 h-3.5" /> Send Message</>}
                  </button>
                </div>
              ) : (
                <div className="rounded-xl px-4 py-4 text-center space-y-2" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}>
                  <div className="text-2xl">🎉</div>
                  <div className="text-sm font-bold text-white">Got it{name ? `, ${name}` : ""}!</div>
                  <div className="text-xs leading-relaxed" style={{ color: "#d1d5db" }}>{autoReply}</div>
                  <button
                    onClick={handleClose}
                    className="mt-1 text-xs px-4 py-1.5 rounded-full font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af", cursor: "pointer" }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
      )}
    </>
  );
}
