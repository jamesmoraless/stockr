"use client";

import { useState, useEffect, FormEvent } from "react";
import { getAuth } from "firebase/auth";
import ProtectedRoute from "@/components/protectedroute";
import StockHistoricalChart from "@/components/stockhistoricalchart";
import CryptoHistoricalChart from "@/components/cryptohistoricalchart";


interface WatchlistItem {
  ticker: string;
  fundamentals?: {
    current_price?: string;
    change?: string;
    volume?: string;
    pe_ratio?: string;
    price_fcf?: string;
    operating_margin?: string;
    beta?: string;
    company?: string;
    lt_debt_equity?: string;
    sector?: string;
    avg_volume?: string;
    "52_week_high"?: string;
    "52_week_low"?: string;
  };
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
  const user = auth.currentUser;
  if (user) {
    console.log("User authenticated");
    return await user.getIdToken();
  }
  console.log("No authenticated user");
  return "";
}

export default function Home() {
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickerInput, setTickerInput] = useState("");
  // State to track which row's dropdown is open (using ticker as identifier)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // State to track which stock is being explored
  const [selectedStock, setSelectedStock] = useState<WatchlistItem | null>(null);

  // Fetch the current watchlist from the backend
  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const token = await getFirebaseIdToken();
        console.log("Fetched token:", token);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/stocks`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ticker: tickerInput }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add stock");
      }
      // Re-fetch the updated watchlist after successfully adding the stock
      const updatedResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/stocks`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const updatedWatchlist = await updatedResponse.json();
      setWatchlist(updatedWatchlist);
      setShowAddStockModal(false);
      setTickerInput("");
    } catch (error) {
      console.error("Error adding stock:", error);
      alert("Error adding stock: " + error);
    }
  };

  // Toggle the dropdown for a given ticker
  const toggleDropdown = (ticker: string) => {
    setOpenDropdown((prev) => (prev === ticker ? null : ticker));
  };

  // Handler to delete a stock by calling the DELETE API endpoint
  const handleDeleteStock = async (ticker: string) => {
    try {
      const token = await getFirebaseIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/${ticker.toUpperCase()}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete stock");
      }
      // Remove the deleted ticker from the local watchlist state
      setWatchlist((prev) => prev.filter((item) => item.ticker !== ticker));
      setOpenDropdown(null);
    } catch (error) {
      console.error("Error deleting stock:", error);
      alert("Error deleting stock: " + error);
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
                  onClick={() => setShowAddStockModal(true)}
              >
                Add Stock
              </button>
            </div>
          </div>

          {/* Watchlist Table Container */}
          <div className="overflow-visible mt-4 border rounded-lg relative">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
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
                            <td className="px-6 py-4 relative">
                              <button
                                  onClick={() => toggleDropdown(item.ticker)}
                                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                              >
                                &#8942;
                              </button>
                              {openDropdown === item.ticker && (
                                  <ul className="absolute right-0 top-full w-32 bg-white border -translate-x-2 -mt-4 border-gray-200 rounded shadow-lg z-50">
                                    <li>
                                      <a
                                          href="#"
                                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleDeleteStock(item.ticker);
                                          }}
                                      >
                                        Delete
                                      </a>
                                    </li>
                                    <li>
                                      <a
                                          href="#"
                                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedStock(item);
                                            setOpenDropdown(null);
                                          }}
                                      >
                                        Explore
                                      </a>
                                    </li>
                                  </ul>
                              )}
                            </td>
                          </tr>
                      ))
                  ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center">
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

          {/* Explore Stock Popup Modal */}
          {selectedStock && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg w-96 relative">
              <span
                  className="absolute top-2 right-2 cursor-pointer text-xl font-bold text-gray-500 hover:text-gray-700"
                  onClick={() => setSelectedStock(null)}
              >
                &times;
              </span>
                  <h2 className="text-xl font-semibold mb-4">
                    Explore {selectedStock.fundamentals?.company}
                  </h2>
                  {/* You can add additional information or components here */}
                  <div className="space-y-2">
                    <p>
                      <strong>Sector:</strong>{" "}
                      {selectedStock.fundamentals?.sector || "N/A"}
                    </p>
                    <p>
                      <strong>Current Price:</strong>{" "}
                      {selectedStock.fundamentals?.current_price || "N/A"}
                    </p>
                    <p>
                      <strong>52 Week High:</strong>{" "}
                      {selectedStock.fundamentals?.["52_week_high"] || "N/A"}
                    </p>
                    <p>
                      <strong>52 Week Low:</strong>{" "}
                      {selectedStock.fundamentals?.["52_week_low"] || "N/A"}
                    </p>
                    <p>
                      <strong>Change:</strong>{" "}
                      {selectedStock.fundamentals?.change || "N/A"}
                    </p>
                    <p>
                      <strong>Volume:</strong>{" "}
                      {selectedStock.fundamentals?.volume || "N/A"}
                    </p>
                    <p>
                      <strong>Average Volume:</strong>{" "}
                      {selectedStock.fundamentals?.avg_volume || "N/A"}
                    </p>
                    <p>
                      <strong>Price/Earnings Ratio:</strong>{" "}
                      {selectedStock.fundamentals?.pe_ratio || "N/A"}
                    </p>
                    <p>
                      <strong>Free Cash Flow Price:</strong>{" "}
                      {selectedStock.fundamentals?.price_fcf || "N/A"}
                    </p>
                    <p>
                      <strong>Operating Margin:</strong>{" "}
                      {selectedStock.fundamentals?.operating_margin || "N/A"}
                    </p>
                    <p>
                      <strong>Beta:</strong>{" "}
                      {selectedStock.fundamentals?.beta || "N/A"}
                    </p>
                    <p>
                      <strong>Long Term Debt/Equity:</strong>{" "}
                      {selectedStock.fundamentals?.lt_debt_equity || "N/A"}
                    </p>
                  </div>
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



        {/*
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Market Historical Data</h1>

          <section>
            <h2 className="text-xl font-semibold mb-2">Crypto Data: BTC</h2>
            <CryptoHistoricalChart symbol="BTC"/>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Stock Data: AAPL</h2>
            <StockHistoricalChart symbol="AAPL"/>
          </section>

        </div>

        */}


      </ProtectedRoute>
  );
}
