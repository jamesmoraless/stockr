"use client";

import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { getAuth } from "firebase/auth";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutEntryProps {
  refresh: number;
  portfolioId: string | null;
}

interface PortfolioEntry {
  ticker: string;
  shares: number;
  book_value: number;
  average_cost: number;
  market_value?: number;
  total_value?: number;
  color?: string;
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

const DoughnutGraph: React.FC<DoughnutEntryProps> = ({ refresh, portfolioId }) => {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!portfolioId) return;

    const fetchPortfolioData = async () => {
      try {
        setLoading(true);
        setError("");

        // First, fetch the portfolio data to get shares and other details
        const token = await getFirebaseIdToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/${portfolioId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch portfolio data");
        }

        const data = await response.json();
        console.log("Portfolio data for graph:", data.portfolio);

        // For each asset, fetch its current market price
        const portfolioWithMarketValues = await Promise.all(
          data.portfolio.map(async (entry: PortfolioEntry, index: number) => {
            try {
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

              let marketPrice = 0;
              if (response.ok) {
                const marketData = await response.json();
                console.log(`Market data for ${entry.ticker}:`, marketData);

                if (marketData.market_price && marketData.market_price !== "N/A") {
                  // Convert market price to number explicitly
                  marketPrice = Number(marketData.market_price);
                }
              }

              // Calculate total value (shares * market price)
              const shares = Number(entry.shares) || 0;
              const totalValue = shares * marketPrice;

              console.log(`${entry.ticker}: Shares=${shares}, Market Price=${marketPrice}, Total=${totalValue}`);

              return {
                ...entry,
                market_value: marketPrice,
                total_value: totalValue,
                // Add color for consistency with your table component
                color: getGrayShade(index)
              };
            } catch (err) {
              console.error(`Error processing ${entry.ticker}:`, err);
              return { ...entry, market_value: 0, total_value: 0 };
            }
          })
        );

        console.log("Processed portfolio for graph:", portfolioWithMarketValues);
        setPortfolio(portfolioWithMarketValues);
      } catch (err: any) {
        console.error("Portfolio fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [refresh, portfolioId]);

  // Get a gray shade based on index
  const getGrayShade = (index: number) => {
    const grayShades = [
      "#F0F0F0", "#E3E3E3", "#D7D7D7", "#CACACA",
      "#BDBDBD", "#B1B1B1", "#A4A4A4", "#989898",
      "#8B8B8B", "#7E7E7E", "#727272", "#656565",
      "#585858", "#4C4C4C", "#3F3F3F", "#333333",
      "#262626", "#191919", "#0D0D0D", "#000000",
    ];
    return grayShades[index % grayShades.length];
  };

  if (!portfolioId) return <p>Loading portfolio...</p>;
  if (loading) return <p>Loading chart...</p>;
  if (error) return <p>Error: {error}</p>;

  // Calculate total portfolio value using total_value (shares * market_value)
  const sumOfAllAssetValues = portfolio.reduce(
    (total, asset) => total + Number(asset.total_value || 0),
    0
  );

  // Define chart data
  const chartData = {
    labels: portfolio.map((asset) => asset.ticker),
    datasets: [
      {
        data: portfolio.map((asset) => Number(asset.total_value || 0)),
        backgroundColor: portfolio.map((asset) => asset.color),
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    cutout: "40%", // Adjusts the thickness of the doughnut
    layout: {
      padding: {
        bottom: 20, // 20px bottom padding
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const percentage = sumOfAllAssetValues
              ? ((value / sumOfAllAssetValues) * 100).toFixed(2)
              : "0.00";
            return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          padding: 20,
        },
      },
    },
  };

  // Don't render the chart if there's no data
  if (portfolio.length === 0 || sumOfAllAssetValues <= 0) {
    return (
      <div className="doughnut-container">
        <p className="text-center">No portfolio data available to display.</p>
      </div>
    );
  }

  return (
    <div className="doughnut-container">
      <p className="text-2xl tracking-[-0.08em] flex-1 max-w-2xl mb-3">
        Total Portfolio Value: ${sumOfAllAssetValues.toLocaleString()}
      </p>
      <div className="doughnut-wrapper">
        <Doughnut data={chartData} options={options} />
      </div>

      <style jsx>{`
        .doughnut-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 500px;
          margin: auto;
          padding: 20px;
        }

        .doughnut-wrapper {
          width: 100%;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default DoughnutGraph;