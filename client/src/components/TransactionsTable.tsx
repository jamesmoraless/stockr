"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

interface Transaction {
  id: string;
  ticker: string;
  shares: number;
  price: number;
  transaction_type: string;
  created_at: string;
}

export default function TransactionsTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  async function getFirebaseIdToken(): Promise<string> {
    const auth = getAuth();
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe(); // stop listening after the first change
        if (user) {
          const token = await user.getIdToken();
          resolve(token);
        } else {
          resolve("");
        }
      }, reject);
    });
  }
  
  // Fetch transactions from backend
  const fetchTransactions = async () => {
    setLoading(true);
    setError("");

    try {
      const token = await getFirebaseIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch transactions");

      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Handle transaction deletion
  const deleteTransaction = async (transactionId: string) => {
    try {
      const token = await getFirebaseIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${transactionId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete transaction");

      // Remove the transaction from the list after successful deletion
      setTransactions((prev) => prev.filter((txn) => txn.id !== transactionId));
    } catch (err: any) {
      setError(err.message || "Error deleting transaction.");
    }
  };

  if (loading) return <p>Loading transactions...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (transactions.length === 0) return <p>No transactions found.</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Transaction History (Last 15)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 text-left">Ticker</th>
              <th className="py-3 px-4 text-left">Shares</th>
              <th className="py-3 px-4 text-left">Price</th>
              <th className="py-3 px-4 text-left">Type</th>
              <th className="py-3 px-4 text-left">Date</th>
              {/* <th className="py-3 px-4 text-center">Actions</th> */}
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4">{txn.ticker}</td>
                <td className="py-2 px-4">{txn.shares}</td>
                <td className="py-2 px-4">${txn.price.toFixed(2)}</td>
                <td className={`py-2 px-4 font-bold ${txn.transaction_type === "buy" ? "text-green-600" : "text-red-600"}`}>
                  {txn.transaction_type.toUpperCase()}
                </td>
                <td className="py-2 px-4">{new Date(txn.created_at).toLocaleDateString()}</td>
                {/* <td className="py-2 px-4 text-center">
                  <button 
                    onClick={() => deleteTransaction(txn.id)}
                    className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                  >
                    Delete
                  </button>
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th, td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        th {
          background: #f3f3f3;
        }
      `}</style>
    </div>
  );
}
