import { Routes, Route, Link } from "react-router-dom";
import SummaryPage from "./pages/SummaryPage";
import AddTransactionPage from "./pages/AddTransactionPage";
import TransactionsPage from "./pages/TransactionsPage";
import Navbar from "./components/Navbar";

function App() {

  // Renders data
  return (
  <div className = 'min-h-screen'>
    <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<SummaryPage />} />
          <Route path="/add" element={<AddTransactionPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
        </Routes>
      </main>
  </div>
  );

}

export default App;
