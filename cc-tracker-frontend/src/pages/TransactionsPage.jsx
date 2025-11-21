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
        async function fetchTransactions()
    })
}