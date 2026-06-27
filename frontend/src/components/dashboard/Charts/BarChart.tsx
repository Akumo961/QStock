import React from 'react';

interface BarChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string;
    }[];
  };
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const values = data.datasets[0]?.data ?? [];
  const labels = data.labels ?? [];

  if (values.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#888' }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...values, 0) || 1; // avoid divide-by-zero when every value is 0

  return (
    <div>
      <svg width="100%" height="300" viewBox="0 0 500 300">
        {/* Y-axis */}
        <line x1="50" y1="20" x2="50" y2="250" stroke="black" strokeWidth="2" />
        {/* X-axis */}
        <line x1="50" y1="250" x2="450" y2="250" stroke="black" strokeWidth="2" />

        {/* Bars */}
        {values.map((value, index) => {
          const barWidth = 40;
          const spacing = 20;
          const x = 60 + index * (barWidth + spacing);
          const barHeight = (value / maxValue) * 200;
          const y = 250 - barHeight;

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={data.datasets[0].backgroundColor || '#1976d2'}
              />
              <text x={x + barWidth / 2} y="270" textAnchor="middle" fontSize="12">
                {labels[index]}
              </text>
              <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="12">
                {value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default BarChart;