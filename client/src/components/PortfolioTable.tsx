"use client";

import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import SellAssetModal from "@/components/SellAssetModal";
import PurchaseAssetModal from "@/components/PurchaseAssetModal";
import StockHistoricalChartPersonal from "@/components/stockhistoricalchart_personal";
import InsertCsvModal from "@/components/InsertCsvModal";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";

const kaisei = { className: "font-kaisei" };

const grayShades = [
  "#F0F0F0", "#E3E3E3", "#D7D7D7", "#CACACA",
  "#BDBDBD", "#B1B1B1", "#A4A4A4", "#989898",
  "#8B8B8B", "#7E7E7E", "#727272", "#656565",
  "#585858", "#4C4C4C", "#3F3F3F", "#333333",
  "#262626", "#191919", "#0D0D0D", "#000000",
];

interface PortfolioEntry {
  ticker: string;
  shares: number;
  average_cost: number;
  book_value: number;
  market_price?: number | null;
  market_value?: number | null;
  portfolio_percentage: number;
  color?: string;
}

interface PortfolioTableProps {
  refresh: number;
  portfolioId: string | null;
  onAssetAdded: () => void;
}

async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve("");
      }
    }, reject);
  });
}

const PortfolioTable: React.FC<PortfolioTableProps> = ({
  refresh,
  portfolioId,
  onAssetAdded,
}) => {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<PortfolioEntry | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [selectedAssetForChart, setSelectedAssetForChart] = useState<PortfolioEntry | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch portfolio data
const fetchPortfolio = async () => {
  if (!portfolioId) return;
  setLoading(true);
  setError("");
  try {
    const token = await getFirebaseIdToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/${portfolioId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) throw new Error("Failed to fetch portfolio");
    const data = await res.json();

    // For each asset, fetch its current market price
    const portfolioWithMarketValues = await Promise.all(
      data.portfolio.map(async (entry: PortfolioEntry) => {
        const token = await getFirebaseIdToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/stock/current/${entry.ticker}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        let marketPrice = null;
        let marketValue = null;
        if (response.ok) {
          const marketData = await response.json();
          marketPrice =
            marketData.market_price !== "N/A" ? marketData.market_price : null;

          // Calculate market value (price * shares)
          if (marketPrice !== null) {
            marketValue = marketPrice * entry.shares;
          }
        }
        return {
          ...entry,
          market_price: marketPrice,
          market_value: marketValue
        };
      })
    );

    // Update portfolio percentages based on market value instead of book value
    setPortfolio(calculatePortfolioPercentage(portfolioWithMarketValues));
  } catch (err: any) {
    setError(err.message || "An error occurred");
  } finally {
    setLoading(false);
  }
};

  // Fetch market prices for portfolio assets (triggered manually via refresh button)
  const fetchMarketPrices = async () => {
    if (portfolio.length === 0) return;
    setLoading(true);
    try {
      const updatedPortfolio = await Promise.all(
        portfolio.map(async (entry) => {
          const token = await getFirebaseIdToken();
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/stock/current/${entry.ticker}`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (!response.ok) throw new Error("Failed to fetch market price");
          const data = await response.json();
          const price = data.market_price !== "N/A" ? data.market_price : null;
          // Calculate market value as price * shares
          const marketValue = price !== null ? price * entry.shares : null;

          return {
            ...entry,
            market_price: price,
            market_value: marketValue
          };
        })
      );
      // Recalculate portfolio percentages based on the updated market values
      setPortfolio(calculatePortfolioPercentage(updatedPortfolio));
    } catch {
      // Optionally set an error here
    } finally {
      setLoading(false);
    }
  };

  // Calculate portfolio percentage for each asset based on market value and assign a grayscale color
  const calculatePortfolioPercentage = (portfolio: PortfolioEntry[]): PortfolioEntry[] => {
    // Calculate total market value of all assets with valid market values
    const totalMarketValue = portfolio.reduce((acc, entry) => {
      if (entry.market_value != null && !isNaN(Number(entry.market_value))) {
        return acc + entry.market_value;
      }
      return acc;
    }, 0);

    // If there's no valid market value, fall back to book value
    const totalValue = totalMarketValue > 0
      ? totalMarketValue
      : portfolio.reduce((acc, entry) => acc + entry.book_value, 0);

    return portfolio.map((entry, index) => {
      // Use market value for percentage calculation if available, otherwise use book value
      const valueForPercentage = (entry.market_value != null && !isNaN(Number(entry.market_value)))
        ? entry.market_value
        : entry.book_value;

      return {
        ...entry,
        portfolio_percentage: totalValue > 0 ? (valueForPercentage / totalValue) * 100 : 0,
        color: grayShades[index % grayShades.length],
      };
    });
  };

  const openSellModal = (asset: PortfolioEntry) => {
    setSelectedAsset(asset);
    setIsSellModalOpen(true);
    setDropdownOpen(null);
  };

  const toggleDropdown = (ticker: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDropdownOpen((prev) => (prev === ticker ? null : ticker));
  };

  const handleAssetSold = async () => {
    await fetchPortfolio();
    setIsSellModalOpen(false);
  };

  // Called after an asset is added via the PurchaseAssetModal
  const handleAssetAdded = async () => {
    setIsAssetModalOpen(false);
    onAssetAdded(); // Let the parent know so it can refresh other parts (e.g. DoughnutGraph)
    await fetchPortfolio();
  };

  useEffect(() => {
    // Re-fetch the portfolio whenever refresh changes or we get a valid portfolioId
    fetchPortfolio();
  }, [refresh, portfolioId]);

  // Remove the useEffect that calls fetchMarketPrices whenever portfolio changes.
  // Instead, fetch market prices only when the user clicks the refresh button.

  return (
    <div className={`w-full`}>
      {/* Top Buttons Always Visible */}
      <div className="flex justify-end">
        {/* Insert CSV Section */}
        <button
          onClick={() => setIsCsvModalOpen(true)}
          className="w-6 h-8 flex items-center justify-center transition-all"
        >
          <span className="relative w-4 h-4 flex items-center justify-center">
            <i className="fa-solid fa-file-csv text-gray-400"></i>
          </span>
        </button>

        {/* Add Asset Button */}
        <button
          onClick={() => setIsAssetModalOpen(true)}
          className="w-6 h-8 flex items-center justify-center transition-all"
        >
          <span className="relative w-4 h-4 flex items-center justify-center">
            <i className="fas fa-plus text-gray-400"></i>
          </span>
        </button>

        {/* Refresh Market Prices */}
        <button
          onClick={fetchMarketPrices}
          className="w-6 h-8 flex items-center justify-center transition-all"
        >
          <span className="relative w-4 h-4 flex items-center justify-center">
            <i className="fas fa-rotate-right text-gray-400"></i>
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="mt-1 h-[350px] overflow-y-auto tracking-[-0.08em]">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shares</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Portfolio %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">

            {loading ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center">
                    <img src="/spinner.svg" alt="Loading spinner ..." className="mx-auto w-8 h-8"/>
                  </td>
                </tr>
            ) : error ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-red-500">
                    Error: {error}
                </td>
              </tr>
            ) : portfolio.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center tracking-[-0.08em]">
                  Import your individual stocks or your portfolio.
                </td>
              </tr>
            ) : (
              portfolio.map((entry, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="px-4">{entry.ticker}</td>
                  <td className="px-4">{entry.shares}</td>
                  <td className="px-4">${entry.average_cost.toFixed(2)}</td>
                  <td className="px-4">${entry.book_value.toFixed(2)}</td>
                  <td className="px-4">
                    {entry.market_value != null && !isNaN(Number(entry.market_value))
                      ? `$${Number(entry.market_value).toFixed(2)}`
                      : "N/A"}
                  </td>
                  <td className="px-4">
                    <div>
                      <span>{entry.portfolio_percentage.toFixed(2)}%</span>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${entry.portfolio_percentage}%`,
                            backgroundColor: "#333333",
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-9 relative text-left">
                    <button
                      onClick={(event) => toggleDropdown(entry.ticker, event)}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none bg-white font-light"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                    {dropdownOpen === entry.ticker && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 shadow-lg z-50">
                        <ul>
                          <li>
                            <button
                              onClick={() => openSellModal(entry)}
                              className="block px-4 py-2 text-black tracking-[-0.08em] hover:bg-gray-100 w-full text-left"
                            >
                              Sell
                            </button>
                          </li>
                          <li>

                            <button
                                disabled
                              onClick={() => {
                                setSelectedAssetForChart(entry);
                                setDropdownOpen(null);
                              }}
                              className="block px-4 py-2 text-black tracking-[-0.08em] w-full text-left"
                            >
                              Explore
                            </button>

                          </li>
                        </ul>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sell Asset Modal */}
      {isSellModalOpen && selectedAsset && (
        <SellAssetModal
          onClose={() => setIsSellModalOpen(false)}
          onAssetSold={handleAssetSold}
          initialTicker={selectedAsset.ticker}
          maxShares={selectedAsset.shares}
          portfolioId={portfolioId ?? ""}
        />
      )}

      {/* Purchase Asset Modal */}
      {isAssetModalOpen && portfolioId && (
        <PurchaseAssetModal
          onClose={() => setIsAssetModalOpen(false)}
          onAssetAdded={handleAssetAdded}
          portfolioId={portfolioId}
        />
      )}

      {/* CSV Upload Modal */}
      {isCsvModalOpen && portfolioId && (
        <InsertCsvModal
          portfolioId={portfolioId}
          onClose={() => setIsCsvModalOpen(false)}
          onUploadSuccess={() => {
            onAssetAdded(); // Refresh the portfolio
            setIsCsvModalOpen(false);
          }}
        />
      )}

      {/* Explore Chart Modal */}
      {selectedAssetForChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative p-4">
            <StockHistoricalChartPersonal
              symbol={selectedAssetForChart.ticker}
              name={selectedAssetForChart.ticker}
              onClose={() => setSelectedAssetForChart(null)}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .add-asset-button {
          width: 100%;
          background-color: #f5f5f5;
          color: #333;
          padding: 12px 0;
          font-size: 1rem;
          font-weight: bold;
          border: none;
          border-radius: 5px;
          margin-top: 5px;
          margin-bottom: 5px;
          text-align: center;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
        }

        .add-asset-button:hover {
          background-color: #e0e0e0;
        }

        .add-asset-button:active {
          background-color: #d6d6d6;
        }
      `}</style>
    </div>
  );
};

export default PortfolioTable;