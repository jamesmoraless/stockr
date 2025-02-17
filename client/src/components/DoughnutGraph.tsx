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
  book_value: number;
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

        const token = await getFirebaseIdToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/graph/${portfolioId}`,
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
        setPortfolio(data.portfolio || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [refresh, portfolioId]);

  if (!portfolioId) return <p>Loading portfolio...</p>;
  if (loading) return <p>Loading chart...</p>;
  if (error) return <p>Error: {error}</p>;
  if (portfolio.length === 0) return <p>No assets in portfolio to display.</p>;

  const sumOfAllAssetValues = portfolio.reduce(
    (total, asset) => total + asset.book_value,
    0
  );

  const data = {
    labels: portfolio.map((asset) => asset.ticker),
    datasets: [
      {
        data: portfolio.map((asset) => asset.book_value),
        backgroundColor: [
          "#F0F0F0",
          "#E3E3E3",
          "#D7D7D7",
          "#CACACA",
          "#BDBDBD",
          "#B1B1B1",
          "#A4A4A4",
          "#989898",
          "#8B8B8B",
          "#7E7E7E",
          "#727272",
          "#656565",
          "#585858",
          "#4C4C4C",
          "#3F3F3F",
          "#333333",
          "#262626",
          "#191919",
          "#0D0D0D",
          "#000000",
        ],
        hoverOffset: 10,
      },
    ],
  };

const options = {
  maintainAspectRatio: false,
  cutout: "40%", // Adjusts the thickness of the doughnut
  layout: {
    padding: {
      bottom: 20, // Add 20px of bottom padding
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const value = context.raw;
          const percentage = ((value / sumOfAllAssetValues) * 100).toFixed(2);
          return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
        },
      },
    },
    legend: {
      display: true,
      position: "bottom" as const,
      labels: {
        padding: 20, // Extra spacing around each legend item (optional)
      },
    },
  },
};

return (
    <div className="doughnut-container">
      <p className="text-2xl tracking-[-0.08em] flex-1 max-w-2xl mb-3">
        Total Portfolio Value: ${sumOfAllAssetValues.toLocaleString()}
      </p>
      <div className="doughnut-wrapper">
        <Doughnut data={data} options={options} />
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
