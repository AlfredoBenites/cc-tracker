import { useEffect, useMemo, useRef, useState } from "react";
/* ---------- helpers ---------- */
const fmtMoney = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : n;

function parseDateLoose(s) {
  // supports "YYYY-MM-DD" or "MM/DD/YYYY"
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const us  = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

  if (iso.test(s)) {
    const [, y, m, d] = s.match(iso);
    return { y: +y, m: +m, d: +d };
  }
  if (us.test(s)) {
    const [, mm, dd, yy] = s.match(us);
    return { y: +yy, m: +mm, d: +dd };
  }
  // fallback to Date
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

function toKeyYMD(s) {
  const parts = parseDateLoose(s);
  if (!parts) return s; // leave as-is if unknown
  const mm = String(parts.m).padStart(2, "0");
  const dd = String(parts.d).padStart(2, "0");
  return `${parts.y}-${mm}-${dd}`;
}

function niceDate(s) {
  const p = parseDateLoose(s);
  if (!p) return s;
  const d = new Date(p.y, p.m - 1, p.d);
  return d.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const FILTER_KEY = "cc-tracker-filters";

const CARDS = [
  "Chase Freedom Unlimited",
  "Capital One Quicksilver",
  "AMEX Blue Cash Everyday",
  "Discover it Student Cash Back",
];

const CATEGORIES = [
  { name: "Groceries", tone: "emerald" },
  { name: "Dining", tone: "pink" },
  { name: "Gas", tone: "amber" },
  { name: "Travel", tone: "sky" },
  { name: "Drugstores", tone: "violet" },
  { name: "Online Shopping", tone: "purple" },
  { name: "Public Transit", tone: "fuchsia" },
  { name: "Utilities", tone: "lime" },
  { name: "Entertainment", tone: "yellow" },
  { name: "Amazon", tone: "rose" },
  { name: "Rent", tone: "sky" },
  { name: "Other", tone: "slate" },
];

const badgeTones = {
  good: "bg-emerald-600/20 text-emerald-200 border-emerald-600/30",
  warn: "bg-amber-600/20 text-amber-200 border-amber-600/30",
  muted: "bg-white/10 text-gray-200 border-white/10",
  emerald: "bg-emerald-600/20 text-emerald-200 border-emerald-600/30",
  pink: "bg-pink-600/20 text-pink-200 border-pink-600/30",
  amber: "bg-amber-600/20 text-amber-200 border-amber-600/30",
  sky: "bg-sky-600/20 text-sky-200 border-sky-600/30",
  violet: "bg-violet-600/20 text-violet-200 border-violet-600/30",
  slate: "bg-slate-600/20 text-slate-200 border-slate-600/30",
  purple: "bg-purple-600/20 text-purple-200 border-purple-600/30",
  fuchsia: "bg-fuchsia-600/20 text-fuchsia-200 border-fuchsia-600/30",
  lime: "bg-lime-600/20 text-lime-200 border-lime-600/30",
  yellow: "bg-yellow-600/20 text-yellow-200 border-yellow-600/30",
  rose: "bg-rose-600/20 text-rose-200 border-rose-600/30",
};

/* accept "3" or "0.03" */
const percentToDecimal = (v) => {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingTx, setEditingTx] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const rowRef = useRef(null);
  const filterStartRef = useRef(null);
  const filterEndRef = useRef(null);
  const [people, setPeople] = useState(["me", "mom", "dad"]);
  const [loadingPeople, setLoadingPeople] = useState(true);

  // filters
  const [filterWho, setFilterWho] = useState("all");
  const [filterCard, setFilterCard] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPaid, setFilterPaid] = useState("all");
  const [filterMerchant, setFilterMerchant] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const cardOptions = useMemo(
    () => ["all", ...Array.from(new Set(transactions.map((t) => t.card).filter(Boolean)))],
    [transactions]
  );
  const whoOptions = useMemo(
    () => ["all", ...Array.from(new Set(people))],
    [people]
  );
  const categoryOptions = useMemo(
    () => ["all", ...Array.from(new Set(transactions.map((t) => t.category).filter(Boolean)))],
    [transactions]
  );
  const merchantOptions = useMemo(
    () => ["all", ...Array.from(new Set(transactions.map((t) => t.merchant).filter(Boolean)))],
    [transactions]
  );

  const filtered = useMemo(
    () =>
      transactions.filter(
        (t) =>
          (filterWho === "all" || t.who === filterWho) &&
          (filterCard === "all" || t.card === filterCard) &&
          (filterCategory === "all" || t.category === filterCategory) &&
          (filterPaid === "all" || (filterPaid === "paid" ? t.paid : !t.paid)) &&
          (filterMerchant === "all" || t.merchant === filterMerchant) &&
          (!filterStartDate || toKeyYMD(t.date) >= filterStartDate) &&
          (!filterEndDate || toKeyYMD(t.date) <= filterEndDate)
      ),
    [
      transactions,
      filterWho,
      filterCard,
      filterCategory,
      filterPaid,
      filterMerchant,
      filterStartDate,
      filterEndDate,
    ]
  );

  // restore saved filters on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTER_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.filterWho) setFilterWho(parsed.filterWho);
      if (parsed.filterCard) setFilterCard(parsed.filterCard);
      if (parsed.filterCategory) setFilterCategory(parsed.filterCategory);
      if (parsed.filterPaid) setFilterPaid(parsed.filterPaid);
      if (parsed.filterMerchant) setFilterMerchant(parsed.filterMerchant);
      if (parsed.filterStartDate) setFilterStartDate(parsed.filterStartDate);
      if (parsed.filterEndDate) setFilterEndDate(parsed.filterEndDate);
      if (typeof parsed.showFilters === "boolean") setShowFilters(parsed.showFilters);
    } catch (e) {
      console.error("Failed to load filters", e);
    }
  }, []);

  // persist filters whenever they change
  useEffect(() => {
    const payload = {
      filterWho,
      filterCard,
      filterCategory,
      filterPaid,
      filterMerchant,
      filterStartDate,
      filterEndDate,
      showFilters,
    };
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to save filters", e);
    }
  }, [
    filterWho,
    filterCard,
    filterCategory,
    filterPaid,
    filterMerchant,
    filterStartDate,
    filterEndDate,
    showFilters,
  ]);

  function resetFilters() {
    setFilterWho("all");
    setFilterCard("all");
    setFilterCategory("all");
    setFilterPaid("all");
    setFilterMerchant("all");
    setFilterStartDate("");
    setFilterEndDate("");
  }

  useEffect(() => {
    // load people
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/people`);
        if (res.ok) {
          const data = await res.json();
          const names = data.map((p) => p.name).filter(Boolean);
          if (names.length) setPeople(names);
        }
      } catch (e) {
        console.error("Failed to load people", e);
      } finally {
        setLoadingPeople(false);
      }
    })();

    (async () => {
      try {
        const res = await fetch(`${baseUrl}/transactions`);
        const data = await res.json();
        setTransactions(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* --- group by normalized date key (YYYY-MM-DD), newest first --- */
  const grouped = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const ka = toKeyYMD(a.date);
      const kb = toKeyYMD(b.date);
      return kb.localeCompare(ka); // newest first by key
    });
    const map = new Map();
    for (const tx of copy) {
      const key = toKeyYMD(tx.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(tx);
    }
    return map; // Map<key, Tx[]>
  }, [filtered]);

  function startEdit(tx) {
    if (editingTx?.id === tx.id) {
      cancelEdit();
      return;
    }
    setEditingTx(tx);
    setStatusMessage(null);
    setForm({
      amount: tx.amount.toString(),
      card: tx.card,
      who: tx.who,
      date: toKeyYMD(tx.date), // normalize back into the input
      category: tx.category,
      merchant: tx.merchant,
      notes: tx.notes ?? "",
      cashback_rate_input:
        tx.cashback_rate != null ? (tx.cashback_rate * 100).toString() : "",
      paid: tx.paid,
    });

    // scroll that row into view a bit
    setTimeout(() => rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  function cancelEdit() {
    setEditingTx(null);
    setForm(emptyForm());
    setStatusMessage(null);
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const onCheckbox = (e) => {
    const { name, checked } = e.target;
    setForm((f) => ({ ...f, [name]: checked }));
  };

  async function handleDelete(id) {
    if (!confirm("Delete this transaction?")) return;
    try {
      const res = await fetch(`${baseUrl}/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        console.error(await res.text());
        alert("Failed to delete.");
        return;
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      cancelEdit();
      setStatusMessage("Transaction deleted");
    } catch (e) {
      console.error(e);
      alert("Network error.");
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingTx) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const payload = {
        card: form.card,
        amount: parseFloat(form.amount),
        date: form.date, // already YYYY-MM-DD
        merchant: form.merchant,
        category: form.category,
        notes: form.notes,
        who: form.who,
        cashback_rate: percentToDecimal(form.cashback_rate_input),
        paid: form.paid,
      };

      if (Number.isNaN(payload.amount)) {
        setStatusMessage("Amount must be a number.");
        setSaving(false);
        return;
      }

      const res = await fetch(`${baseUrl}/transactions/${editingTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(await res.text());
        setStatusMessage("Failed to update transaction.");
      } else {
        const updated = await res.json();
        setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        cancelEdit();
        setStatusMessage("Transaction updated");
      }
    } catch (e) {
      console.error(e);
      setStatusMessage("Network error while updating.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-gray-300">Loading transactions…</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-4">Transactions</h1>

      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-sm font-medium text-gray-100"
        >
          <svg
            className="h-4 w-4 text-gray-200"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          <span>Filters</span>
          <span className="text-xs text-gray-400">{showFilters ? "Hide" : "Show"}</span>
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-200">Filters</span>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white border border-amber-500/60 px-3 py-1 text-xs font-semibold"
            >
              Reset
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-200">
              <span className="block mb-1">Who</span>
              <select
                value={filterWho}
                onChange={(e) => setFilterWho(e.target.value)}
                className={`${inputBase} appearance-none`}
                disabled={loadingPeople}
              >
                {whoOptions.map((p) => (
                  <option key={p} value={p}>{p === "all" ? "Everyone" : p}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-200">
              <span className="block mb-1">Card</span>
              <select
                value={filterCard}
                onChange={(e) => setFilterCard(e.target.value)}
                className={`${inputBase} appearance-none`}
              >
                {cardOptions.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "All cards" : c}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-200">
              <span className="block mb-1">Category</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`${inputBase} appearance-none`}
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-200">
              <span className="block mb-1">Status</span>
              <select
                value={filterPaid}
                onChange={(e) => setFilterPaid(e.target.value)}
                className={`${inputBase} appearance-none`}
              >
                <option value="all">Paid & Unpaid</option>
                <option value="paid">Paid only</option>
                <option value="unpaid">Unpaid only</option>
              </select>
            </label>

            <label className="text-sm font-medium text-gray-200">
              <span className="block mb-1">Merchant</span>
              <select
                value={filterMerchant}
                onChange={(e) => setFilterMerchant(e.target.value)}
                className={`${inputBase} appearance-none`}
              >
                {merchantOptions.map((m) => (
                  <option key={m} value={m}>{m === "all" ? "All merchants" : m}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm font-medium text-gray-200">
                <span className="block mb-1">Start date</span>
                <div className="relative">
                  <input
                    ref={filterStartRef}
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className={`${inputBase} pr-12`}
                  />
                  <div
                    onClick={() => filterStartRef.current?.showPicker?.()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 cursor-pointer p-2 rounded-md transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </label>
              <label className="text-sm font-medium text-gray-200">
                <span className="block mb-1">End date</span>
                <div className="relative">
                  <input
                    ref={filterEndRef}
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className={`${inputBase} pr-12`}
                  />
                  <div
                    onClick={() => filterEndRef.current?.showPicker?.()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 cursor-pointer p-2 rounded-md transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
          No transactions match these filters.
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([key, list]) => (
            <section key={key}>
              <h2 className="text-sm font-semibold text-gray-300 mb-2">
                {niceDate(key)}
              </h2>

              <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                {list.map((tx) => {
                  const isDeposit = tx.amount < 0; // money in
                  const amountAbs = Math.abs(tx.amount);
                  const editDateId = `edit-date-${tx.id}`;

                  return (
                    <div key={tx.id} className="p-0" ref={editingTx?.id === tx.id ? rowRef : null}>
                      {/* row */}
                      <div className="flex items-center gap-3 p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate font-medium">{tx.merchant || tx.category || tx.card}</div>
                            <Badge tone={tx.paid ? "good" : "warn"}>
                              {tx.paid ? "paid" : "unpaid"}
                            </Badge>
                            {tx.category && (
                              <Badge tone={CATEGORIES.find((c) => c.name === tx.category)?.tone ?? "muted"}>
                                {tx.category}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400 truncate">• {tx.card}</span>
                          </div>
                          {tx.notes && (
                            <div className="text-xs text-gray-400 truncate">{tx.notes}</div>
                          )}
                          <div className="text-xs text-gray-400">by {tx.who}</div>
                        </div>

                        <div className={`text-right tabular-nums ${isDeposit ? "text-emerald-300" : "text-gray-100"}`}>
                          {isDeposit ? fmtMoney(amountAbs) : `-${fmtMoney(amountAbs)}`}
                        </div>

                        <button
                          onClick={() => startEdit(tx)}
                          className="ml-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1 text-sm"
                        >
                          Edit
                        </button>
                      </div>

                      {/* inline editor under this row */}
                      {editingTx?.id === tx.id && (
                        <div className="border-t border-white/10 bg-black/20 px-3 pb-4 pt-3">
                          <h3 className="text-sm font-semibold mb-2">Edit</h3>
                          <form onSubmit={handleUpdate} className="grid gap-3 max-w-xl">
                            <Field label="Date">
                              <div className="relative">
                                <input
                                  id={editDateId}
                                  type="date"
                                  name="date"
                                  value={form.date}
                                  onChange={onChange}
                                  className={`${inputBase} pr-12`}
                                />
                                <div
                                  onClick={() => document.getElementById(editDateId)?.showPicker?.()}
                                  className="absolute right-3 top-1/2 -translate-y-1/2
                                            bg-white/10 hover:bg-white/20 cursor-pointer
                                            p-2 rounded-md transition"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 text-gray-300"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              </div>
                            </Field>

                            <Field label="Card">
                              <div className="relative">
                                <select
                                  name="card"
                                  value={form.card}
                                  onChange={onChange}
                                  className={`${inputBase} appearance-none pr-9`}
                                >
                                  {CARDS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                <Chevron />
                              </div>
                            </Field>

                            <div className="grid gap-3 md:grid-cols-2">
                              <Field label="Amount">
                                <input
                                  type="number" step="0.01" inputMode="decimal"
                                  name="amount" value={form.amount} onChange={onChange}
                                  className={inputBase}
                                />
                              </Field>
                              <Field label="Who">
                                <select name="who" value={form.who} onChange={onChange} className={`${inputBase} appearance-none`}>
                                  {people.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </Field>
                            </div>

                            <Field label="Merchant">
                              <input name="merchant" value={form.merchant} onChange={onChange} className={inputBase} />
                            </Field>
                            <Field label="Category">
                              <select name="category" value={form.category} onChange={onChange} className={`${inputBase} appearance-none`}>
                                <option value="">Choose a category…</option>
                                {CATEGORIES.map((c) => (
                                  <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Notes">
                              <input name="notes" value={form.notes} onChange={onChange} className={inputBase} />
                            </Field>

                            <div className="grid gap-3 md:grid-cols-2">
                              <Field label="Cashback (%)">
                                <input
                                  type="number" step="0.1" inputMode="decimal"
                                  name="cashback_rate_input" value={form.cashback_rate_input}
                                  onChange={onChange} className={inputBase} placeholder="e.g., 3"
                                />
                              </Field>

                              <label className="flex items-center gap-3 pt-6">
                                <input
                                  type="checkbox" name="paid" checked={form.paid} onChange={onCheckbox}
                                  className="h-4 w-4 accent-emerald-500"
                                />
                                <span className="text-sm">Mark as paid</span>
                              </label>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="submit" disabled={saving}
                                className={`rounded-lg px-4 py-2 text-sm font-medium text-white
                                  ${saving ? "bg-emerald-600/50 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500"}`}
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>
                              <button type="button" onClick={cancelEdit} className="rounded-lg px-4 py-2 text-sm bg-white/10 hover:bg-white/15">
                                Cancel
                              </button>
                              <button type="button" onClick={() => handleDelete(tx.id)} className="rounded-lg px-4 py-2 text-sm bg-rose-600/80 hover:bg-rose-600 text-white">
                                Delete
                              </button>
                            </div>

                            {statusMessage && <p className="mt-2 text-sm text-gray-200">{statusMessage}</p>}
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----- small UI bits ----- */
function Field({ label, children }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-gray-200">{label}</label>
      {children}
    </div>
  );
}

function Badge({ tone = "muted", children }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTones[tone] ?? badgeTones.muted}`}>{children}</span>
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

function emptyForm() {
  return {
    card: "",
    amount: "",
    who: "me",
    date: "",
    category: "",
    merchant: "",
    notes: "",
    cashback_rate_input: "",
    paid: false,
  };
}

const inputBase =
  "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none " +
  "placeholder:text-gray-400 text-sm focus:ring-2 focus:ring-emerald-500/40";
