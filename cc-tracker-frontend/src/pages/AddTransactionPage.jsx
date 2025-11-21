import { useState } from "react";

// basic starting values
const initialForm = {
  card: "",
  amount: "",
  who: "",
  date: "",
  category: "",
  merchant: "",
  notes: "",
  cashback_rate: "",
  paid: false,
};

function AddTransactionPage() {
  const [form, setForm] = useState(initialForm);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // allows for the changing of values (text, number, select)
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleCheckboxChange(e) {
    const { name, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault(); // stops default browser attempt to refresh page so instead it can fetch the data
    setStatusMessage(null);
    setIsSubmitting(true);

    // try function to send data
    try {
      // convert amount and cashback_rate to numbers
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        cashback_rate: form.cashback_rate === "" ? 0 : parseFloat(form.cashback_rate),
      };

      // makes sure a number is sent
      if (isNaN(payload.amount)) {
        setStatusMessage("Amount must be a number.");
        setIsSubmitting(false);
        return;
      }

      // sending data
      const res = await fetch("http://127.0.0.1:8000/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // if there's an error or not in sending data display it
      if(!res.ok) {
        const errorBody = await res.text();
        console.error("Backend error:", errorBody);
        setStatusMessage("Error: failed to save transaction.");
      } else {
        const data = await res.json();
        console.log("Created transaction:", data);
        setStatusMessage("Transaction saved.");
        setForm(initialForm); // clears form
      }
    } catch (err) {
      console.error("Request error:", err);
      setStatusMessage("Network error while saving.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1>Add Transaction</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Card
          <input
            type="text"
            name="card"
            value={form.card}
            onChange={handleChange}
            placeholder="Capital One Quicksilver, etc."
          />
        </label>

        <label>
          Amount
          <input
            type="number"
            step="0.01"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            placeholder="22.23"
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
          Date
          <input
            type="text" // NEED TO SWITCH TO A DATE PICKER
            name="date"
            value={form.date}
            onChange={handleChange}
            placeholder="11/18/2025"
          />
        </label>

        <label>
          Category
          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="Gas, Dining, Groceries..."
          />
        </label>

        <label>
          Merchant
          <input
            type="text"
            name="merchant"
            value={form.merchant}
            onChange={handleChange}
            placeholder="Amazon, Walmart, Fresco Y Mas..."
          />
        </label>

        <label>
          Notes
          <input
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Christmas gifts, gas for my truck, etc."
          />
        </label>

        <label>
          Cashback rate (decimal)
          <input
            type="number"
            step="0.001"
            name="cashback_rate"
            value={form.cashback_rate}
            onChange={handleChange}
            placeholder="0.03 for 3%"
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            name="paid"
            checked={form.paid}
            onChange={handleCheckboxChange}
          />
          Mark as paid
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Transaction"}
        </button>
      </form>

      {statusMessage && (
        <p style={{ marginTop: "1rem" }}>{statusMessage}</p>
      )}
    </div>
  );
}

export default AddTransactionPage;