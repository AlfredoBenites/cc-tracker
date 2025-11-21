import { Routes, Route, Link } from "react-router-dom";
import SummaryPage from "./pages/SummaryPage";
import AddTransactionPage from "./pages/AddTransactionPage";
import TransactionsPage from "./pages/TransactionsPage";

function App() {

  // Renders data
  return (
  <div style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
    {/* Simple nav to switch pages */}
    <nav style={{ marginBottom: "1rem" }}>
      <Link to="/" style={{ marginRight: "1rem" }}>Dashboard</Link>
      <Link to="/add">Add Transaction</Link>
      <Link to="/transactions">Transactions</Link>
    </nav>

    <Routes>
      <Route path="/" element={<SummaryPage />} />
      <Route path="/add" element={<AddTransactionPage />} />
      <Route path="/transactions" element={<TransactionsPage />} />
    </Routes>
  </div>
  );

}

export default App;
