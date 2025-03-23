"use client";

import React, { useState, useRef } from "react";
import { getAuth } from "firebase/auth";
import SellAssetModal from "@/components/SellAssetModal";
import PurchaseAssetModal from "@/components/PurchaseAssetModal";
import StockHistoricalChartPersonal from "@/components/stockhistoricalchart_personal";
import InsertCsvModal from "@/components/InsertCsvModal";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";

const kaisei = { className: "font-kaisei" };

interface PortfolioEntry {
  ticker: string;
  shares: number;
  book_value: number;
  average_cost: number;
  market_price?: number | null;
  market_value?: number | null;
  portfolio_percentage?: number;
  color?: string;
}

interface PortfolioTableProps {
  portfolioData: PortfolioEntry[];
  portfolioId: string | null;
  onAssetAdded: () => void;
  onRefreshMarketPrices: () => void;
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
  portfolioData,
  portfolioId,
  onAssetAdded,
  onRefreshMarketPrices
}) => {
  const [selectedAsset, setSelectedAsset] = useState<PortfolioEntry | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [selectedAssetForChart, setSelectedAssetForChart] = useState<PortfolioEntry | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

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
    onAssetAdded(); // Refresh all components after selling an asset
    setIsSellModalOpen(false);
  };

  // Called after an asset is added via the PurchaseAssetModal
  const handleAssetAdded = async () => {
    setIsAssetModalOpen(false);
    onAssetAdded(); // Refresh all components
  };

  // Called after CSV upload is successful
  const handleCsvUploadSuccess = () => {
    onAssetAdded(); // Refresh all components
    setIsCsvModalOpen(false);
  };

  return (
    <div className="w-full">
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
          onClick={onRefreshMarketPrices}
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
            {portfolioData.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center tracking-[-0.08em]">
                  Import your individual stocks or your portfolio.
                </td>
              </tr>
            ) : (
              portfolioData.map((entry, index) => (
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
                      <span>{(entry.portfolio_percentage || 0).toFixed(2)}%</span>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${entry.portfolio_percentage || 0}%`,
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
          onUploadSuccess={handleCsvUploadSuccess}
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