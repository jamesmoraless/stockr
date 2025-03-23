"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface HistoryDataPoint {
  date: string;
  value: number;
  market_value?: number;
}

interface PortfolioGrowthProps {
  historyData: HistoryDataPoint[];
  totalValue: number;
}

const PortfolioGrowthChart: React.FC<PortfolioGrowthProps> = ({
  historyData,
  totalValue
}) => {
  // Don't render the chart if there's no data
  if (historyData.length === 0) {
    return (
      <div className="portfolio-growth-container">
        <p className="text-center">
          No portfolio history available. Add transactions to see your growth over time.
        </p>
      </div>
    );
  }

  // Format dates for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate percentage change from first data point to last
  const calculateGrowth = () => {
    if (historyData.length < 2) return 0;
    const firstValue = historyData[0].value;
    const lastValue = historyData[historyData.length - 1].value;

    if (firstValue === 0) return 0;
    return ((lastValue - firstValue) / firstValue) * 100;
  };

  const growth = calculateGrowth();
  const growthColor = growth >= 0 ? "#16a34a" : "#dc2626";

  // Prepare chart data
  const chartData = {
    labels: historyData.map(item => item.date),
    datasets: [
      {
        label: "Portfolio Market Value",
        data: historyData.map(item => item.value),
        fill: false,
        borderColor: "#333333",
        backgroundColor: "#333333",
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'month' as const,
          tooltipFormat: 'MMM d, yyyy',
          displayFormats: {
            month: 'MMM yyyy'
          }
        },
        title: {
          display: false,
        },
      },
      y: {
        title: {
          display: false,
        },
        ticks: {
          callback: (value: any) => {
            return '$' + value.toLocaleString();
          }
        }
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `Market Value: $${context.parsed.y.toLocaleString()}`;
          },
          title: (tooltipItems: any) => {
            return formatDate(tooltipItems[0].label);
          }
        }
      },
      legend: {
        display: false,
      },
    },
  };

  // Get the latest value from the history data
  const latestValue = historyData.length > 0 ? historyData[historyData.length - 1].value : 0;
  // Determine which value to display (prefer total_value from API if available)
  const displayValue = totalValue > 0 ? totalValue : latestValue;

  return (
    <div className="portfolio-growth-container">
      <div className="summary-section">
        <div className="flex items-center justify-between">
          <h2 className="text-xl tracking-[-0.08em]">Portfolio Growth</h2>
          <p className="text-lg" style={{color: growthColor}}>
            {growth >= 0 ? "+" : ""}{growth.toFixed(2)}%
          </p>
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
          <p>Initial: ${historyData.length > 0 ? historyData[0].value.toLocaleString() : "0"}</p>
          <p>Current: ${displayValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <Line data={chartData} options={options}/>
      </div>

      <style jsx>{`
      .portfolio-growth-container {
      width: 100%; 
      height: 100%;  /* This will expand to parent container's height */
      padding: 5px;
      font-family: 'kaisei', sans-serif;
      display: flex;
      flex-direction: column;
      }
      
      .chart-wrapper {
      flex: 1;
      width: 100%;
      min-height: 200px; /* Increase this value to make the chart taller */
      margin-top: 5px;
      }
      
      .summary-section {
      background-color: #f9f9f9;
      padding: 8px;
      border: 1px solid #e5e5e5;
      }
      `}</style>
    </div>
  );
};

export default PortfolioGrowthChart;