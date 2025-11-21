import { Routes, Route, Link } from "react-router-dom";
import SummaryPage from "./pages/SummaryPage";
import AddTransactionPage from "./pages/AddTransactionPage";
import { useEffect, useState } from "react";

function App() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  async function fetchSummary() {
    try {
      const res = await fetch("http://127.0.0.1:8000/summary/by-card");
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      setLoading(false);
    }
  }

  fetchSummary();
}, []);


  // Loading
  if (loading) return <div style={{ padding: "1rem" }}>Loading…</div>;

  // If no data show no data message
  if (!summary || Object.keys(summary).length === 0) {
    return (
      <div style={{ padding: "1rem" }}>
        No data yet. Add some transactions.
      </div>
    );
  }

  // Renders data
  return (
  <div style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
    {/* Simple nav to switch pages */}
    <nav style={{ marginBottom: "1rem" }}>
      <Link to="/" style={{ marginRight: "1rem" }}>Dashboard</Link>
      <Link to="/add">Add Transaction</Link>
    </nav>

    <Routes>
      <Route path="/" element={<SummaryPage />} />
      <Route path="/add" element={<AddTransactionPage />} />
    </Routes>
  </div>
  );

}

export default App;
