"use client";

import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

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

interface DoughnutGraphProps {
  portfolioData: PortfolioEntry[];
  totalValue: number;
}

const DoughnutGraph: React.FC<DoughnutGraphProps> = ({
  portfolioData,
  totalValue
}) => {
  // Calculate total portfolio value using market_value (shares * market_price)
  const sumOfAllAssetValues = totalValue ||
    portfolioData.reduce((total, asset) => total + Number(asset.market_value || 0), 0);

  // Don't render the chart if there's no data
  if (portfolioData.length === 0 || sumOfAllAssetValues <= 0) {
    return (
      <div className="doughnut-container">
        <p className="text-center">No portfolio data available to display.</p>
      </div>
    );
  }

  // Define chart data
  const chartData = {
    labels: portfolioData.map((asset) => asset.ticker),
    datasets: [
      {
        data: portfolioData.map((asset) => Number(asset.market_value || 0)),
        backgroundColor: portfolioData.map((asset) => asset.color),
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

  return (
    <div className="doughnut-container">
      <p className="text-xl tracking-[-0.08em] flex-1 max-w-2xl mb-3">
        Total Portfolio Value: ${sumOfAllAssetValues.toLocaleString()}
      </p>
      <div className="doughnut-wrapper">
        <Doughnut data={chartData} options={options}/>
      </div>

      <style jsx>{`
      .doughnut-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 450px;
      margin: auto;
      padding: 10px;
      }
      
      .doughnut-wrapper {
      width: 100%;
      height: 250px;
      display: flex;
      align-items: center;
      justify-content: center;
      }
      `}</style>
    </div>
  );
};

export default DoughnutGraph;