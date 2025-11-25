import { useEffect, useState } from "react";

// Small helper to format dollars nicely
const fmt = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : n;

// Map card name -> small image/logo (put files in /public/cards/*)
const CARD_IMAGES = {
  "Chase Freedom Unlimited": "/cards/Chase-Freedom-Unlimited.avif",
  "Discover it Student Cash Back": "/cards/discover-it-student-cash-back.webp",
  "AMEX Blue Cash Everyday": "/cards/amex-blue-cash-everyday.avif",
  "Capital One Quicksilver": "/cards/capital-one-quicksilver.png",
  // add more mappings as you wish:
  // "Chase Sapphire Preferred": "/cards/sapphire-preferred.png",
};

export default function SummaryPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/summary/by-card`
          : "http://127.0.0.1:8000/summary/by-card");
        const data = await res.json();
        setSummary(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-56 mb-4 rounded bg-white/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary || Object.keys(summary).length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Card Summary</h1>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
          No data yet. Add a transaction to see your summary.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Card Summary</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(summary).map(([cardName, cardData]) => (
          <div
            key={cardName}
            className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition"
          >
            {/* Header with logo + name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-14 rounded-md overflow-hidden bg-white/10 flex items-center justify-center">
                {/* Small image; replace with your own file path in /public/cards */}
                {CARD_IMAGES[cardName] ? (
                  <img
                    src={CARD_IMAGES[cardName]}
                    alt={`${cardName} card`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-300 px-2">{cardName.split(" ")[0]}</span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">{cardName}</h2>
                <p className="text-xs text-gray-400">overview</p>
              </div>
            </div>

            {/* Top line stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label="Total" value={fmt(cardData.total)} />
              <Stat label="Paid" value={fmt(cardData.paid)} />
              <Stat label="Unpaid" value={fmt(cardData.unpaid)} />
            </div>

            {/* Cashback chips */}
            {"cashback_earned" in cardData && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Chip label="Cashback earned" value={fmt(cardData.cashback_earned)} tone="good" />
                <Chip label="Cashback pending" value={fmt(cardData.cashback_pending)} tone="warn" />
              </div>
            )}

            {/* Per-person breakdown */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Per person</h3>
              <div className="divide-y divide-white/10 rounded-lg border border-white/10">
                {Object.entries(cardData.per_person || {}).map(([person, p]) => (
                  <div key={person} className="p-3 grid grid-cols-5 gap-2 text-sm">
                    <div className="col-span-2 font-medium">{person}</div>
                    <div className="col-span-3 grid grid-cols-3 gap-2 text-right">
                      <span className="text-gray-300">{fmt(p.total)}</span>
                      <span className="text-emerald-300">{fmt(p.paid)}</span>
                      <span className="text-rose-300">{fmt(p.owes)}</span>
                    </div>
                    {/* row 2: cashback */}
                    <div className="col-span-5 grid grid-cols-2 gap-2 text-xs text-gray-400 pt-1">
                      <span>Cashback earned: <b className="text-gray-200">{fmt(p.cashback_earned)}</b></span>
                      <span className="text-right">Pending: <b className="text-gray-200">{fmt(p.cashback_pending)}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

// Small presentational pieces
function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function Chip({ label, value, tone = "base" }) {
  const tones = {
    base: "bg-white/10 text-gray-200",
    good: "bg-emerald-600/20 text-emerald-200 border border-emerald-600/30",
    warn: "bg-amber-600/20 text-amber-200 border border-amber-600/30",
  };
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs ${tones[tone]}`}>
      <span className="opacity-80">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}