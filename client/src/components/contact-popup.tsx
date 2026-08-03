import { useState } from "react";
import { X, MessageCircle } from "lucide-react";

const AUTO_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["refund", "money back", "return", "reimburse"],
    response: "We totally understand 💛 Instead of a refund, we'd love to personally find you an even better deal. For direct assistance, reach us at contact@elitedeals.us — include a quick description and we'll make it right! 🎯",
  },
  {
    keywords: ["scam", "fake", "fraud", "not real", "doesn't work"],
    response: "Your trust means the world to us 🙏 Every deal we list is personally verified. Please reach out directly at contact@elitedeals.us with details of what happened — we investigate every report and respond personally. ✅",
  },
  {
    keywords: ["broken", "error", "bug", "not working", "issue", "problem", "glitch"],
    response: "Ugh, tech gremlins! 😤 Please email us at contact@elitedeals.us with what happened and your device type — we'll get it sorted fast. Try a quick refresh in the meantime! ⚡",
  },
  {
    keywords: ["cancel", "unsubscribe", "stop", "remove"],
    response: "Totally respect that! 💙 You're always in full control here. For anything specific, reach us at contact@elitedeals.us — we'll handle it personally and promptly. 🌟",
  },
  {
    keywords: ["help", "how", "what", "where", "explain"],
    response: "Happy to help! 🙌 Browse deals on the main page, tap 'Get This Deal Now' to grab any offer, or use the AI chatbot for personalised picks. For anything else, email us directly at contact@elitedeals.us 😊",
  },
];

const DEFAULT_RESPONSE =
  "Thanks for reaching out! 💌 Please email us directly at contact@elitedeals.us — we read and personally respond to every message. Include any details so we can help you faster!";

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
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [autoReply, setAutoReply] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setEmail("");
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
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden bg-white"
            style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.35)", animation: "slideUp 0.25s ease" }}
          >
            {/* Close button */}
            <div className="flex justify-end px-4 pt-4">
              <button onClick={handleClose} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col items-center text-sm text-slate-800 px-6 pb-8">
                <p className="text-xs bg-indigo-200 text-indigo-600 font-medium px-3 py-1 rounded-full">Contact Us</p>
                <h1 className="text-3xl font-bold py-3 text-center">Let's Get In Touch.</h1>
                <p className="text-gray-500 pb-8 text-center text-sm">
                  Or just reach out manually to us at{" "}
                  <a href="mailto:contact@elitedeals.us" className="text-indigo-600 hover:underline">
                    contact@elitedeals.us
                  </a>
                </p>

                <div className="w-full">
                  <label className="font-medium text-sm">Full Name</label>
                  <div className="flex items-center mt-2 mb-4 h-10 pl-3 border border-slate-300 rounded-full focus-within:ring-2 focus-within:ring-indigo-400 transition-all overflow-hidden">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                      <path d="M18.311 16.406a9.64 9.64 0 0 0-4.748-4.158 5.938 5.938 0 1 0-7.125 0 9.64 9.64 0 0 0-4.749 4.158.937.937 0 1 0 1.623.938c1.416-2.447 3.916-3.906 6.688-3.906 2.773 0 5.273 1.46 6.689 3.906a.938.938 0 0 0 1.622-.938M5.938 7.5a4.063 4.063 0 1 1 8.125 0 4.063 4.063 0 0 1-8.125 0" fill="#475569" />
                    </svg>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-full px-2 w-full outline-none bg-transparent text-sm"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <label className="font-medium text-sm">Email Address</label>
                  <div className="flex items-center mt-2 mb-4 h-10 pl-3 border border-slate-300 rounded-full focus-within:ring-2 focus-within:ring-indigo-400 transition-all overflow-hidden">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                      <path d="M17.5 3.438h-15a.937.937 0 0 0-.937.937V15a1.563 1.563 0 0 0 1.562 1.563h13.75A1.563 1.563 0 0 0 18.438 15V4.375a.94.94 0 0 0-.938-.937m-2.41 1.874L10 9.979 4.91 5.313zM3.438 14.688v-8.18l5.928 5.434a.937.937 0 0 0 1.268 0l5.929-5.435v8.182z" fill="#475569" />
                    </svg>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-full px-2 w-full outline-none bg-transparent text-sm"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <label className="font-medium text-sm">Message</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full mt-2 p-2 bg-transparent border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-sm"
                    placeholder="Enter your message"
                    required
                  />

                  <button
                    type="submit"
                    disabled={!message.trim() || sending}
                    className="flex items-center justify-center gap-1 mt-5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-2.5 w-full rounded-full transition text-sm font-medium"
                  >
                    {sending ? "Sending..." : (
                      <>
                        Submit Form
                        <svg className="mt-0.5" width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="m18.038 10.663-5.625 5.625a.94.94 0 0 1-1.328-1.328l4.024-4.023H3.625a.938.938 0 0 1 0-1.875h11.484l-4.022-4.025a.94.94 0 0 1 1.328-1.328l5.625 5.625a.935.935 0 0 1-.002 1.33" fill="#fff" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center px-6 pb-8 pt-2 text-center">
                <p className="text-xs bg-indigo-200 text-indigo-600 font-medium px-3 py-1 rounded-full mb-4">Message Sent!</p>
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Got it{name ? `, ${name}` : ""}!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">{autoReply}</p>
                <button
                  onClick={handleClose}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-8 py-2.5 rounded-full transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
      )}
    </>
  );
}
