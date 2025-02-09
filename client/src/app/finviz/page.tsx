"use client";

import { useState, useEffect, FormEvent } from "react";
import { getAuth } from "firebase/auth";
import ProtectedRoute from "@/components/protectedroute";

interface CalendarEvent {
  Date: string;
  Time: string;
  Country: string;
  Event: string;
  Impact: string;
  Actual?: string;
  Forecast?: string;
  Previous?: string;
}

// This function retrieves your Firebase ID token. Adjust according to your Firebase auth logic.
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

export default function Home() {
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickerInput, setTickerInput] = useState("");

  // Fetch economic calendar information (if needed)
  const grabInformation = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/calendar`);
      const data = await response.json();
      console.log('Economic Calendar Data:', data);
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    }
  };

  // Fetch the current watchlist from the backend
  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const token = await getFirebaseIdToken();
        console.log("Fetched token:", token);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/stocks`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch watchlist");
        }
        const data = await response.json();
        setWatchlist(data);

        console.log(data);
      } catch (error) {
        console.error("Error fetching watchlist:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, []);










  // Handler to add a new stock to the watchlist
  const handleAddStock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!tickerInput.trim()) {
      alert("Please enter a ticker symbol");
      return;
    }

    try {
      const token = await getFirebaseIdToken();
      console.log("Adding ticker with token:", token);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/watchlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticker: tickerInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add stock");
      }

      // Re-fetch the updated watchlist after successfully adding the stock
      const updatedResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/stocks`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const updatedWatchlist = await updatedResponse.json();
      setWatchlist(updatedWatchlist);
      setShowAddStockModal(false);
      setTickerInput("");
    } catch (error) {
      console.error("Error adding stock:", error);
      alert("Error adding stock: " + error);
    }
  };





















  return (
 <ProtectedRoute>
      <div className="container mx-auto p-4 h-screen">
        <div className="flex flex-col md:flex-row justify-between items-center mt-4">
          <div>
            <h1 className="text-2xl font-bold">Watchlist</h1>
          </div>
          <div className="flex space-x-2">
            <button
              className="btn btn-primary bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => setShowAddStockModal(true)}>
              Add Stock
            </button>
          </div>
        </div>

        {/* Watchlist Table */}
        <div className="overflow-x-auto mt-4 border rounded-lg">
          {loading ? (
            <div className="p-4 text-center">Loading watchlist...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {watchlist.length > 0 ? (
                  watchlist.map((item) => (
                    <tr key={item.ticker}>
                      <td className="px-6 py-4">{item.ticker}</td>
                      <td className="px-6 py-4">
                        {item.fundamentals?.current_price || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-green-500">
                        {item.fundamentals?.change || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        {item.fundamentals?.volume || "N/A"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center">
                      No stocks in your watchlist.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Stock Popup Modal */}
        {showAddStockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 relative">
              <span
                className="absolute top-2 right-2 cursor-pointer text-xl font-bold text-gray-500 hover:text-gray-700"
                onClick={() => setShowAddStockModal(false)}
              >
                &times;
              </span>
              <h2 className="text-xl font-semibold mb-4">Add New Stock</h2>
              <form className="space-y-4" onSubmit={handleAddStock}>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ticker Symbol
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="e.g. AAPL"
                    required
                    value={tickerInput}
                    onChange={(e) => setTickerInput(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddStockModal(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Add Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Inline Styles for Popup (optional) */}
        <style jsx>{`
          /* Additional popup styling if needed */
          .popup {
            display: block;
          }
          .popup-content {
            width: 400px;
          }
          .close {
            cursor: pointer;
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}