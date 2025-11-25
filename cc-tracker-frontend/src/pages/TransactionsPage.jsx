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

  useEffect(() => {
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
    const copy = [...transactions];
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
  }, [transactions]);

  function startEdit(tx) {
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

      {transactions.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
          No transactions yet.
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
                            {tx.category && <Badge tone="muted">{tx.category}</Badge>}
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
                              <input type="date" name="date" value={form.date} onChange={onChange} className={inputBase} />
                            </Field>

                            <Field label="Card">
                              <input name="card" value={form.card} onChange={onChange} className={inputBase} />
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
                                  <option value="me">me</option>
                                  <option value="mom">mom</option>
                                  <option value="dad">dad</option>
                                </select>
                              </Field>
                            </div>

                            <Field label="Merchant">
                              <input name="merchant" value={form.merchant} onChange={onChange} className={inputBase} />
                            </Field>
                            <Field label="Category">
                              <input name="category" value={form.category} onChange={onChange} className={inputBase} />
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
  const tones = {
    good: "bg-emerald-600/20 text-emerald-200 border-emerald-600/30",
    warn: "bg-amber-600/20 text-amber-200 border-amber-600/30",
    muted: "bg-white/10 text-gray-200 border-white/10",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${tones[tone]}`}>{children}</span>
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