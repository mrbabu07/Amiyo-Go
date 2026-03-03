import { useEffect, useRef } from "react";

export default function AnalyticsChart({
  data,
  type = "line",
  title,
  color = "#3B82F6",
  height = 300,
  showGrid = true,
  animate = true,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find min/max values
    const values = data.map((d) => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const valueRange = maxValue - minValue || 1;

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "#E5E7EB";
      ctx.lineWidth = 1;

      // Horizontal grid lines
      for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // Vertical grid lines
      const stepX = chartWidth / (data.length - 1 || 1);
      for (let i = 0; i < data.length; i++) {
        const x = padding + stepX * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
      }
    }

    if (type === "line") {
      drawLineChart(
        ctx,
        data,
        padding,
        chartWidth,
        chartHeight,
        maxValue,
        minValue,
        valueRange,
        color,
        animate,
      );
    } else if (type === "bar") {
      drawBarChart(
        ctx,
        data,
        padding,
        chartWidth,
        chartHeight,
        maxValue,
        minValue,
        valueRange,
        color,
        animate,
      );
    } else if (type === "area") {
      drawAreaChart(
        ctx,
        data,
        padding,
        chartWidth,
        chartHeight,
        maxValue,
        minValue,
        valueRange,
        color,
        animate,
      );
    }

    // Draw labels
    drawLabels(ctx, data, padding, chartWidth, chartHeight, maxValue, minValue);
  }, [data, type, color, showGrid, animate]);

  const drawLineChart = (
    ctx,
    data,
    padding,
    chartWidth,
    chartHeight,
    maxValue,
    minValue,
    valueRange,
    color,
    animate,
  ) => {
    if (data.length === 0) return;

    const stepX = chartWidth / (data.length - 1 || 1);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    data.forEach((point, index) => {
      const x = padding + stepX * index;
      const y =
        padding +
        chartHeight -
        ((point.value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    ctx.fillStyle = color;
    data.forEach((point, index) => {
      const x = padding + stepX * index;
      const y =
        padding +
        chartHeight -
        ((point.value - minValue) / valueRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Add white border to points
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
    });
  };

  const drawBarChart = (
    ctx,
    data,
    padding,
    chartWidth,
    chartHeight,
    maxValue,
    minValue,
    valueRange,
    color,
    animate,
  ) => {
    const barWidth = (chartWidth / data.length) * 0.8;
    const barSpacing = (chartWidth / data.length) * 0.2;

    ctx.fillStyle = color;

    data.forEach((point, index) => {
      const x = padding + (chartWidth / data.length) * index + barSpacing / 2;
      const barHeight = ((point.value - minValue) / valueRange) * chartHeight;
      const y = padding + chartHeight - barHeight;

      // Add gradient
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + "80");
      ctx.fillStyle = gradient;

      ctx.fillRect(x, y, barWidth, barHeight);
    });
  };

  const drawAreaChart = (
    ctx,
    data,
    padding,
    chartWidth,
    chartHeight,
    maxValue,
    minValue,
    valueRange,
    color,
    animate,
  ) => {
    if (data.length === 0) return;

    const stepX = chartWidth / (data.length - 1 || 1);

    // Create gradient
    const gradient = ctx.createLinearGradient(
      0,
      padding,
      0,
      padding + chartHeight,
    );
    gradient.addColorStop(0, color + "40");
    gradient.addColorStop(1, color + "10");

    // Draw area
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);

    data.forEach((point, index) => {
      const x = padding + stepX * index;
      const y =
        padding +
        chartHeight -
        ((point.value - minValue) / valueRange) * chartHeight;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw line on top
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, index) => {
      const x = padding + stepX * index;
      const y =
        padding +
        chartHeight -
        ((point.value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  };

  const drawLabels = (
    ctx,
    data,
    padding,
    chartWidth,
    chartHeight,
    maxValue,
    minValue,
  ) => {
    ctx.fillStyle = "#6B7280";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";

    // X-axis labels
    const stepX = chartWidth / (data.length - 1 || 1);
    data.forEach((point, index) => {
      if (index % Math.ceil(data.length / 6) === 0) {
        // Show every nth label to avoid crowding
        const x = padding + stepX * index;
        ctx.fillText(point.label, x, chartHeight + padding + 20);
      }
    });

    // Y-axis labels
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (maxValue - minValue) * (1 - i / 5);
      const y = padding + (chartHeight / 5) * i + 4;
      ctx.fillText(Math.round(value).toLocaleString(), padding - 10, y);
    }
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className="relative" style={{ height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
