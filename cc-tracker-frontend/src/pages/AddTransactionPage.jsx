import { useState } from "react";

/* ---------- Config you can edit anytime ---------- */
const PEOPLE = ["me", "mom", "dad"];

const CARDS = [
  "Chase Freedom Unlimited",
  "Capital One Quicksilver",
  "AMEX Blue Cash Everyday",
  "Discover it Student Cash Back",
  // add more…
];

const CATEGORIES = [
  { name: "Groceries", tone: "emerald" },
  { name: "Dining", tone: "pink" },
  { name: "Gas", tone: "amber" },
  { name: "Travel", tone: "sky" },
  { name: "Drugstores", tone: "violet" },
  { name: "Other", tone: "slate" },
];

const tones = {
  emerald: "bg-emerald-600/20 text-emerald-200 border-emerald-600/30",
  pink: "bg-pink-600/20 text-pink-200 border-pink-600/30",
  amber: "bg-amber-600/20 text-amber-200 border-amber-600/30",
  sky: "bg-sky-600/20 text-sky-200 border-sky-600/30",
  violet: "bg-violet-600/20 text-violet-200 border-violet-600/30",
  slate: "bg-slate-600/20 text-slate-200 border-slate-600/30",
};

/* ---------- Helpers ---------- */
const fmtPercentInputToDecimal = (v) => {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  // allow both “3” and “0.03”
  return n > 1 ? n / 100 : n;
};

const initialForm = {
  card: "",
  amount: "",
  who: "me",
  date: "",
  category: "",
  merchant: "",
  notes: "",
  cashback_rate_input: "", // user enters 3 for 3%
  paid: false,
};

const inputBase =
  "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none " +
  "placeholder:text-gray-400 text-sm focus:ring-2 focus:ring-emerald-500/40";
const labelBase = "text-sm font-medium text-gray-200";
const section = "grid gap-2";

export default function AddTransactionPage() {
  const [form, setForm] = useState(initialForm);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const onCheckbox = (e) => {
    const { name, checked } = e.target;
    setForm((f) => ({ ...f, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = {
        date: form.date,
        card: form.card,
        amount: parseFloat(form.amount),
        who: form.who,
        category: form.category,
        merchant: form.merchant,
        notes: form.notes,
        paid: form.paid,
        // convert % string to decimal for backend
        cashback_rate: fmtPercentInputToDecimal(form.cashback_rate_input),
      };

      if (Number.isNaN(payload.amount)) {
        setStatusMessage("Amount must be a number.");
        setIsSubmitting(false);
        return;
      }

      const base = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${base}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error(t);
        setStatusMessage("Error: failed to save transaction.");
      } else {
        setStatusMessage("✅ Transaction saved.");
        setForm(initialForm);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Network error while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.name === form.category);

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-4">Add Transaction</h1>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Date */}
        <div className={section}>
          <label className={labelBase}>Date</label>
          <input type="date" name="date" value={form.date} onChange={onChange} className={inputBase} />
        </div>

        {/* Card (dropdown from list) */}
        <div className={section}>
          <label className={labelBase}>Card</label>
          <div className="relative">
            <select
              name="card"
              value={form.card}
              onChange={onChange}
              className={`${inputBase} appearance-none pr-9`}
            >
              <option value="" disabled>Choose a card…</option>
              {CARDS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>

        {/* Amount + Who */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className={section}>
            <label className={labelBase}>Amount</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              name="amount"
              value={form.amount}
              onChange={onChange}
              placeholder="22.23"
              className={inputBase}
            />
          </div>

          <div className={section}>
            <label className={labelBase}>Who</label>
            <div className="relative">
              <select
                name="who"
                value={form.who}
                onChange={onChange}
                className={`${inputBase} appearance-none pr-9`}
              >
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>
        </div>

        {/* Category (dropdown) */}
        <div className={section}>
          <label className={labelBase}>Category</label>
          <div className="relative">
            <select
              name="category"
              value={form.category}
              onChange={onChange}
              className={`${inputBase} appearance-none pr-9`}
            >
              <option value="" disabled>Choose a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <Chevron />
          </div>
          {/* show a colored pill for the picked category */}
          {selectedCat && (
            <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border w-fit ${tones[selectedCat.tone]}`}>
              {selectedCat.name}
            </span>
          )}
        </div>

        {/* Merchant */}
        <div className={section}>
          <label className={labelBase}>Merchant</label>
          <input
            type="text"
            name="merchant"
            value={form.merchant}
            onChange={onChange}
            placeholder="Amazon, Walmart, Fresco y Más…"
            className={inputBase}
          />
        </div>

        {/* Notes */}
        <div className={section}>
          <label className={labelBase}>Notes</label>
          <input
            name="notes"
            value={form.notes}
            onChange={onChange}
            placeholder="Christmas gifts, gas for my truck, etc."
            className={inputBase}
          />
        </div>

        {/* Cashback input as PERCENT */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className={section}>
            <label className={labelBase}>Cashback (%)</label>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              name="cashback_rate_input"
              value={form.cashback_rate_input}
              onChange={onChange}
              placeholder="e.g., 3 for 3%"
              className={inputBase}
            />
          </div>

          <label className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              name="paid"
              checked={form.paid}
              onChange={onCheckbox}
              className="h-4 w-4 accent-emerald-500"
            />
            <span className="text-sm text-gray-200">Mark as paid</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium
            ${isSubmitting ? "bg-emerald-600/50 text-white cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white"} transition`}
        >
          {isSubmitting ? "Saving..." : "Save Transaction"}
        </button>
      </form>

      {statusMessage && <p className="mt-4 text-sm text-gray-200">{statusMessage}</p>}
    </div>
  );
}

/* small chevron for custom select */
function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300"
      viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
    >
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
    </svg>
  );
}