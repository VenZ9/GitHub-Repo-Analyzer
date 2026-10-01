import React from 'react';

interface MetricProps {
  label: string;
  value: string | number;
}

export const MetricCard: React.FC<MetricProps> = ({ label, value }) => {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
};
