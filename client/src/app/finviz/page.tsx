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
  const user = auth.currentUser;
  if (user) {
    console.log('USER SUCCESS');
    return await user.getIdToken();
  }
  console.log('USER FAIL');
  return "";
}

export default function Home() {
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickerInput, setTickerInput] = useState("");

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
        // error here wtf is going on

        // `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist`
        console.log(token)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/watchlist`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          // check in order -> the token -> the
          throw new Error(token);
         //  throw new Error("Failed to fetch watchlist");
        }
        const data = await response.json();
        setWatchlist(data);
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

    try {
      const token = await getFirebaseIdToken();
      // error here
      console.log(token)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/watchlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticker: tickerInput }),
      });

      if (!response.ok) {
        throw new Error(token);
        // throw new Error("Failed to add stock");
      }

      // Re-fetch the updated watchlist
      const updatedResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/watchlist`, {
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
    }
  };


  return (
      <ProtectedRoute>
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Column: Watchlist */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Watchlist</h1>
            <button
              onClick={() => setShowAddStockModal(true)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Stock
            </button>
          </div>

          {/* Add Stock Modal */}
          {showAddStockModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg w-96">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Add New Stock</h2>
                  <button
                    onClick={() => setShowAddStockModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
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

          {/* Watchlist Table */}
          <div className="border rounded-lg overflow-hidden">
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
                      <tr key={item.id}>
                        <td className="px-6 py-4">{item.ticker}</td>
                        <td className="px-6 py-4">
                          {item.data?.fundamentals?.Price || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-green-500">
                          {item.data?.fundamentals?.Change || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          {item.data?.fundamentals?.Volume || "N/A"}
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
        </div>

        {/* Second Column: Additional Content */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Additional Section</h2>
            <p>
              This is your second column. You can add charts, news, or any other
              content relevant to your project.
            </p>

            <button
                type="button"
                onClick={grabInformation}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Get Economic Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
      </ProtectedRoute>
  );
}
