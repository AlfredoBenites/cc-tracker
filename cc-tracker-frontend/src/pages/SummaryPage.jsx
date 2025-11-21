import { useEffect, useState } from "react";

function SummaryPage() {
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

  if (loading) return <div>Loading…</div>;

  if (!summary || Object.keys(summary).length === 0) {
    return <div>No data yet. Add some transactions.</div>;
  }

  return (
    <div>
      <h1>Card Summary</h1>
      {Object.entries(summary).map(([cardName, cardData]) => (
        <div key={cardName} style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "1rem" }}>
          <h2>{cardName}</h2>
          <p>Total: ${cardData.total}</p>
          <p>Paid: ${cardData.paid}</p>
          <p>Unpaid: ${cardData.unpaid}</p>

          {"cashback_earned" in cardData && (
            <>
              <p>Cashback earned: ${cardData.cashback_earned}</p>
              <p>Cashback pending: ${cardData.cashback_pending}</p>
            </>
          )}

          <h3>Per person</h3>
          {Object.entries(cardData.per_person || {}).map(([person, p]) => (
            <div key={person}>  
              <strong>{person}</strong>: owes ${p.owes}, paid ${p.paid}, cashback earned ${p.cashback_earned}, pending ${p.cashback_pending}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default SummaryPage;
