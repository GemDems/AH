import { Link } from "wouter";
import { ArrowLeft, Shield, ExternalLink } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen" style={{ background: "#0d0f1a", color: "#e5e7eb" }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-80 transition-opacity" style={{ color: "#a78bfa", textDecoration: "none" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <Shield className="w-5 h-5" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">About Elite Deals Hub</h1>
            <p className="text-xs" style={{ color: "#6b7280" }}>Legal Information & Disclosures</p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>

          <section className="rounded-xl p-5 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-bold text-white text-base">What We Do</h2>
            <p>Elite Deals Hub is a curated affiliate marketplace that sources and presents high-quality deals from trusted retailers. Our team manually reviews every product listed to ensure it meets our quality and legitimacy standards before it appears on the platform.</p>
          </section>

          <section className="rounded-xl p-5 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-bold text-white text-base">About Our Live Stats & Savings Figures</h2>
            <p>
              <strong className="text-white">Please note:</strong> figures shown around the site — including "live viewers," "orders this hour," the community savings goal/progress bar, and the percentage of members who "got more than they expected" — are <strong className="text-white">estimates and rounded averages</strong> based on aggregate site activity, not exact real-time counts.
            </p>
            <p>They're intended as a general, directional sense of activity and community engagement, not a precise audit figure. They may not exactly reflect the number of people on the site, the exact dollar amount saved, or the exact order count at any given moment, and progress bars may not be drawn to a strict linear scale of the number shown beside them.</p>
          </section>

          <section className="rounded-xl p-5 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-bold text-white text-base">Affiliate Disclosure</h2>
            <p>
              <strong className="text-white">Important:</strong> Elite Deals Hub participates in affiliate marketing programs. This means that when you click on product links on this site and make a purchase, we may earn a commission at <em>no additional cost to you</em>.
            </p>
            <p>We may participate in affiliate programs including, but not limited to: Amazon Associates, Walmart Affiliate Program, eBay Partner Network, Partner Stack, ShareASale, Impact, and other retailer-specific affiliate programmes.</p>
            <p>Our affiliate relationships do not influence our editorial decisions. We only feature deals we believe offer genuine value. Commissions help us keep this service free for all users.</p>
          </section>

          <section className="rounded-xl p-5 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-bold text-white text-base">FTC Compliance</h2>
            <p>In accordance with the Federal Trade Commission (FTC) guidelines (16 C.F.R. Part 255), we disclose that this website contains affiliate links. Clicking these links and making a purchase may result in Elite Deals Hub receiving a commission. This disclosure applies site-wide.</p>
          </section>

          <section className="rounded-xl p-5 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-bold text-white text-base">Verified Source Badge</h2>
            <p>Products displaying the 🔒 <strong className="text-white">Verified Source</strong> badge have been confirmed as available through authorised retailers (such as Amazon, Walmart, or similar trusted platforms). This badge indicates the deal links to a verified, legitimate product listing — not that we have independently inspected the physical product.</p>
          </section>

          <section className="rounded-xl p-5 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-bold text-white text-base">Pricing & Availability</h2>
            <p>Prices and availability are accurate at the time of publishing. Deals can change or expire at any time without notice — we recommend checking the retailer's site for the most current pricing before purchasing. We are not responsible for price changes after you leave this site.</p>
          </section>

          <section className="rounded-xl p-5 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-bold text-white text-base">100% Satisfaction Guarantee</h2>
            <p>Our guarantee applies to the deal curation quality — if a deal we featured turns out to be misleading or unavailable, we will personally find you an equivalent or better alternative at no cost. This is not a retailer return/refund guarantee; for product returns, please contact the retailer directly.</p>
          </section>

          <section className="rounded-xl p-5 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-bold text-white text-base">Privacy</h2>
            <p>Elite Deals Hub does not collect personal identifying information without your consent. Device identifiers used for the referral and rewards system are stored locally on your device. We do not sell or share personal data with third parties.</p>
          </section>

          <section className="rounded-xl p-5 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="font-bold text-white text-base">Contact</h2>
            <p>For questions, deal removal requests, partnership enquiries, or any concerns:</p>
            <a href="mailto:contact@elitedeals.us" className="inline-flex items-center gap-1.5 font-medium hover:opacity-80 transition-opacity" style={{ color: "#60a5fa", textDecoration: "none" }}>
              <ExternalLink className="w-3.5 h-3.5" />
              contact@elitedeals.us
            </a>
            <p className="text-xs">We aim to respond to all enquiries within 24 hours.</p>
          </section>

          <p className="text-xs text-center pt-4" style={{ color: "#4b5563" }}>
            © {new Date().getFullYear()} Elite Deals Hub. All rights reserved. Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
          </p>
        </div>
      </div>
    </div>
  );
}
