import React from 'react';

interface PieChartProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor?: string[];
    };
  };
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.datasets.data.reduce((sum, value) => sum + value, 0);
  let currentAngle = 0;

  const getCoordinates = (angle: number, radius: number) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: 150 + radius * Math.cos(radian),
      y: 150 + radius * Math.sin(radian)
    };
  };

  return (
    <div>
      <svg width="300" height="300" viewBox="0 0 300 300">
        {total === 0 ? (
          <>
            <circle cx="150" cy="150" r="100" fill="#eeeeee" stroke="white" strokeWidth="2" />
            <circle cx="150" cy="150" r="50" fill="white" />
          </>
        ) : (
          data.datasets.data.map((value, index) => {
            const angle = (value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const start = getCoordinates(startAngle, 100);
            const end = getCoordinates(endAngle, 100);

            const largeArcFlag = angle > 180 ? 1 : 0;

            const pathData = [
              `M 150 150`,
              `L ${start.x} ${start.y}`,
              `A 100 100 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
              `Z`
            ].join(' ');

            return (
              <path
                key={index}
                d={pathData}
                fill={data.datasets.backgroundColor?.[index] || `hsl(${index * 60}, 70%, 50%)`}
                stroke="white"
                strokeWidth="2"
              />
            );
          })
        )}
        {total !== 0 && <circle cx="150" cy="150" r="50" fill="white" />}
      </svg>

      {total === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '12px' }}>
          No data available
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          {data.labels.map((label, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: data.datasets.backgroundColor?.[index] || `hsl(${index * 60}, 70%, 50%)`,
                  marginRight: '10px',
                  borderRadius: '2px'
                }}
              />
              <span>{label}: {data.datasets.data[index]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PieChart;