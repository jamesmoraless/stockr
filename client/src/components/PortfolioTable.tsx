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
  market_value?: number | null;
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
  // 🟢 State Variables
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<PortfolioEntry | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const marketPriceCache = useRef<{ [key: string]: number | null }>({});

  // 🟢 Fetch Portfolio Data
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

  // 🟢 Fetch Market Prices for Portfolio Once on Load
  const fetchMarketPrices = async () => {
    if (portfolio.length === 0) return;
  
    setLoading(true); // Show loading state when fetching prices
  
    const updatedPortfolio = await Promise.all(
      portfolio.map(async (entry) => {
        try {
          const token = await getFirebaseIdToken();
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock/current/${entry.ticker}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
  
          if (!response.ok) throw new Error("Failed to fetch market price");
  
          const data = await response.json();
          const price = data.market_price !== "N/A" ? data.market_price : null;
          return { ...entry, market_value: price };
        } catch {
          return { ...entry, market_value: null };
        }
      })
    );
  
    setPortfolio(updatedPortfolio);
    setLoading(false);
  };
  
  useEffect(() => {
    if (!portfolioId) return;
    fetchPortfolio();
  }, [refresh, portfolioId]);

  useEffect(() => {
    if (portfolio.length > 0) {
      fetchMarketPrices();
    }
  }, [portfolioId]); // 👈 Depend on portfolioId instead of portfolio
  

  // 🟢 Calculate Portfolio Percentage
  const calculatePortfolioPercentage = (portfolio: PortfolioEntry[]): PortfolioEntry[] => {
    const totalBookValue = portfolio.reduce((acc, entry) => acc + entry.book_value, 0);
    return portfolio.map((entry, index) => ({
      ...entry,
      portfolio_percentage: totalBookValue > 0 ? (entry.book_value / totalBookValue) * 100 : 0,
      color: COLORS[index % COLORS.length],
    }));
  };

  const openSellModal = (asset: PortfolioEntry) => {
    console.log("opening sell modal... ");
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

  if (!portfolioId) return <p>Loading portfolio...</p>;
  if (loading) return <p>Loading portfolio...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (portfolio.length === 0) return <p>No assets in portfolio.</p>;

  return (
    <div className="mt-4">
      <button
        onClick={fetchMarketPrices}
        className="w-full bg-gray-200 text-gray-700 py-2 mt-4 rounded-lg hover:bg-gray-300 transition duration-300"
      >
        Refresh Market Values
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2">Ticker</th>
              <th className="px-4 py-2">Shares</th>
              <th className="px-4 py-2">Avg. Cost</th>
              <th className="px-4 py-2">Book Value</th>
              <th className="px-4 py-2">Market Value</th>
              <th className="px-4 py-2">Portfolio %</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {portfolio.map((entry, index) => (
              <tr key={index}>
                <td className="px-4 py-2">{entry.ticker}</td>
                <td className="px-4 py-2">{entry.shares}</td>
                <td className="px-4 py-2">${entry.average_cost.toFixed(2)}</td>
                <td className="px-4 py-2">${entry.book_value.toFixed(2)}</td>
                <td className="px-4 py-2">
                  {entry.market_value != null && !isNaN(Number(entry.market_value))
                    ? `$${Number(entry.market_value).toFixed(2)}`
                    : "N/A"}
                </td>
                <td className="px-4 py-2">
                  <div>
                    <span>{entry.portfolio_percentage.toFixed(2)}%</span>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ width: `${entry.portfolio_percentage}%`, backgroundColor: entry.color }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-center relative"> 
                  <button onClick={(event) => toggleDropdown(entry.ticker, event)}>
                    <EllipsisVerticalIcon className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                  </button>
                  {dropdownOpen === entry.ticker && (
                    <div className="absolute right-0 mt-2 w-28 bg-white border border-gray-200 rounded shadow-lg z-10">
                      <button onClick={() => openSellModal(entry)}>Sell</button>
                      <button>explore</button>
                    </div>
                    
                  )}
                </td>
              </tr>
            ))}
            {isSellModalOpen && selectedAsset && (
              <SellAssetModal
                onClose={() => setIsSellModalOpen(false)}
                onAssetSold={handleAssetSold}
                initialTicker={selectedAsset.ticker}
                maxShares={selectedAsset.shares}
                portfolioId={portfolioId ?? ""}
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PortfolioTable;
