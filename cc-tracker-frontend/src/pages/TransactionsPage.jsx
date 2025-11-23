import { useEffect, useState } from "react";

const emptyForm = {
  card: "",
  amount: "",
  who: "",
  date: "",
  category: "",
  merchant: "",
  notes: "",
  cashback_rate: "",
  paid: false,
}

function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [editingTx, setEditingTx] = useState(null); // transaction that's being edited
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    // load all transactions at once
    useEffect(() => {
        async function fetchTransactions() {
            try {
                const res = await fetch("http://127.0.0.1:8000/transactions");
                const data = await res.json();
                setTransactions(data);
            } catch(err) {
                console.error("Error fetching transactions", err);
            } finally {
                setLoading(false);
            }
        }

        fetchTransactions();
    }, []);

    function startEdit(tx) {
        setEditingTx(tx);
        setStatusMessage(null);

        // pre-fill form with transaction's data
        setForm({
            amount: tx.amount.toString(),
            card: tx.card,
            who: tx.who,
            date: tx.date,
            category: tx.category,
            merchant: tx.merchant,
            notes: tx.notes ?? "",
            cashback_rate: 
                tx.cashback_rate !== undefined && tx.cashback_rate !== null
                ? tx.cashback_rate.toString()
                : "",
            paid: tx.paid
        });
    }

    function cancelEdit() {
        setEditingTx(null);
        setForm(emptyForm);
        setStatusMessage(null);
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    function handleCheckboxChange(e) {
        const { name, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: checked}));
    }

    async function handleUpdate(e) {
        e.preventDefault();
        if(!editingTx) return;

        setSaving(true);
        setStatusMessage(null);

        try {
            const payload = {
                card: form.card,
                amount: parseFloat(form.amount),
                date: form.date,
                merchant: form.merchant,
                category: form.category,
                notes: form.notes,
                who: form.who,
                cashback_rate:
                    form.cashback_rate === "" ? 0 : parseFloat(form.cashback_rate),
                paid: form.paid,
            };

            if (isNaN(payload.amount)) {
                setStatusMessage("Amount must be a number.");
                setSaving(false);
                return;
            }

            const res = await fetch(
                `http://127.0.0.1:8000/transactions/${editingTx.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            if(!res.ok) {
                const body = await res.text();
                console.error("Error from backend:", body);
                setStatusMessage("Failed to update transaction.");
            } else {
                const updated = await res.json();

                // update list with old & new content
                setTransactions((prev) =>
                    prev.map((t) => (t.id === updated.id ? updated : t))
                );

                setStatusMessage("Transaction updated");
                setEditingTx(null);
                setForm(emptyForm);
            }
        } catch (err) {
            console.error("Network error:", err);
            setStatusMessage("Network error while updating.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div>Loading transactions...</div>;

    return (
        <div>
            <h1>Transactions</h1>

            {transactions.length === 0 ? (
                <p>No transactions yet.</p>
            ) : (
                <table
                    style={{
                        width: "120%",
                        borderCollapse: "collapse",
                        marginBottom: "1.5rem",
                    }}
                >
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Card</th>
                            <th>Amount</th>
                            <th>Who</th>
                            <th>Merchant</th>
                            <th>Paid</th>
                            <th>Notes</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx) => (
                            <tr key={tx.id}>
                                <td>{tx.id}</td>
                                <td>{tx.date}</td>
                                <td>{tx.card}</td>
                                <td>${tx.amount.toFixed(2)}</td>
                                <td>{tx.who}</td>
                                <td>{tx.merchant}</td>
                                <td>{tx.paid ? "yes" : "no"}</td>
                                <td>{tx.notes}</td>
                                <td>
                                    <button onClick={() => startEdit(tx)}>Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {editingTx && (
                <div
                    style={{
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        padding: "1rem",
                        maxWidth: "600px"
                    }}
                >
                    <h2>Edit Transaction #{editingTx.id}</h2>

                    <form
                        onSubmit={handleUpdate}
                        style={{ display: "grid", gap: "0.75rem"}}
                    >

                        <label>
                            Date
                            <input
                                type="text"
                                name="date"
                                value={form.date}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Card
                            <input
                                type="text"
                                name="card"
                                value={form.card}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Amount
                            <input
                                type="text"
                                name="amount"
                                value={form.amount}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Who
                            <select name="who" value={form.who} onChange={handleChange}>
                                <option value="me">me</option>
                                <option value="mom">mom</option>
                                <option value="dad">dad</option>
                            </select>
                        </label>

                        <label>
                            Merchant
                            <input
                                type="text"
                                name="merchant"
                                value={form.merchant}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Category
                            <input
                                type="text"
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Notes
                            <input
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                            />
                        </label>

                        <label
                            style = {{display: "flex", alignItems: "center", gap: "0.5rem" }}
                        > Mark as paid
                            <input
                                type="checkbox"
                                name="paid"
                                checked={form.paid}
                                onChange={handleCheckboxChange}
                            />
                        </label>

                        <div style={{ display: "flex", gap: "0.75rem" }}>
                            <button type="submit" disabled={saving}>
                                {saving ? "Saving..." : "Save changes"}
                            </button>
                            <button type="button" onClick={cancelEdit}>
                                Cancel
                            </button>
                        </div>
                    </form>

                    {statusMessage && (
                        <p style={{ marginTop: "0.75rem" }}>{statusMessage}</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default TransactionsPage;