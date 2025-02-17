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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transactions`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

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

  // Handle transaction deletion (if needed)
  const deleteTransaction = async (transactionId: string) => {
    try {
      const token = await getFirebaseIdToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${transactionId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to delete transaction");

      setTransactions((prev) => prev.filter((txn) => txn.id !== transactionId));
    } catch (err: any) {
      setError(err.message || "Error deleting transaction.");
    }
  };

  if (loading)
    return (
      <div className="p-4 text-center">
        Loading transactions...
      </div>
    );
  if (error) return <p className="text-red-500">{error}</p>;
  if (transactions.length === 0)
    return (
      <div className="p-4 text-center">
        No transactions found.
      </div>
    );

  return (
    <div className="w-full tracking-[-0.08em]">
      {/* Scrollable table container */}
      <div className="mt-6 h-[400px] overflow-y-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ticker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Shares
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              {/* Uncomment below if you wish to add an Actions column */}
              {/*
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
              */}
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((txn) => (
              <tr key={txn.id} className="border-t border-gray-200">
                <td className="py-4 px-6">{txn.ticker}</td>
                <td className="py-4 px-6">{txn.shares}</td>
                <td className="py-4 px-6">${txn.price.toFixed(2)}</td>
                <td
                  className={`py-4 px-6 ${
                    txn.transaction_type === "buy"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {txn.transaction_type.toUpperCase()}
                </td>
                <td className="py-4 px-6">
                  {new Date(txn.created_at).toLocaleDateString()}
                </td>
                {/*
                <td className="py-4 px-6">
                  <button
                    onClick={() => deleteTransaction(txn.id)}
                    className="text-red-500 hover:text-red-700 focus:outline-none"
                  >
                    Delete
                  </button>
                </td>
                */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
