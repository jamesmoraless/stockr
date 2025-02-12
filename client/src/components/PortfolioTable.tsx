import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import SellAssetModal from "@/components/SellAssetModal";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import PurchaseAssetModal from "@/components/PurchaseAssetModal";

const COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

interface PortfolioEntry {
  ticker: string;
  shares: number;
  average_cost: number;
  book_value: number;
  market_value: number;
  portfolio_percentage: number;
  color?: string;
}

interface PortfolioTableProps {
  refresh: number;
  portfolioId: string | null;
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

const PortfolioTable: React.FC<PortfolioTableProps> = ({ refresh, portfolioId }) => {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<PortfolioEntry | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!portfolioId) return;
    fetchPortfolio();
  }, [refresh, portfolioId]);

  const fetchPortfolio = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getFirebaseIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/${portfolioId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch portfolio");

      const data = await res.json();
      setPortfolio(calculatePortfolioPercentage(data.portfolio));
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const calculatePortfolioPercentage = (portfolio: PortfolioEntry[]): PortfolioEntry[] => {
    const totalBookValue = portfolio.reduce((acc, entry) => acc + entry.book_value, 0);
    return portfolio.map((entry, index) => ({
      ...entry,
      portfolio_percentage: totalBookValue > 0 ? (entry.book_value / totalBookValue) * 100 : 0,
      color: COLORS[index % COLORS.length],
    }));
  };

  const openSellModal = (asset: PortfolioEntry) => {
    setSelectedAsset(asset);
    setIsSellModalOpen(true);
    setDropdownOpen(null);
  };

  const toggleDropdown = (ticker: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevents the event from bubbling up
    setDropdownOpen((prev) => (prev === ticker ? null : ticker));
  };

  const handleAssetSold = async () => {
    await fetchPortfolio();
    setIsSellModalOpen(false);
  };

  if (!portfolioId) return <p>Loading portfolio...</p>;
  if (loading) return <p>Loading portfolio...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (portfolio.length === 0) return <p>No assets in portfolio.</p>;

  return (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Cost</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Value</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Portfolio %</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {portfolio.map((entry, index) => (
              <tr key={index}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{entry.ticker}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{entry.shares}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">${entry.average_cost.toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">${entry.book_value.toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">${entry.market_value.toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <span>{entry.portfolio_percentage.toFixed(2)}%</span>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ width: `${entry.portfolio_percentage}%`, backgroundColor: entry.color }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center text-sm">
                  <div className="relative inline-block" ref={dropdownRef}>
                    <button
                      onClick={(event) => toggleDropdown(entry.ticker, event)}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Actions"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                    {dropdownOpen === entry.ticker && (
                      <div className="absolute right-0 mt-2 w-28 bg-white border border-gray-200 rounded shadow-lg z-10">
                        <button
                          onClick={() => openSellModal(entry)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Sell
                        </button>
                        <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          Explore
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isSellModalOpen && selectedAsset && (
        <SellAssetModal
          onClose={() => setIsSellModalOpen(false)}
          onAssetSold={handleAssetSold}
          initialTicker={selectedAsset.ticker}
          maxShares={selectedAsset.shares}
          portfolioId={portfolioId}
        />
      )}
    </div>
  );
};

export default PortfolioTable;
