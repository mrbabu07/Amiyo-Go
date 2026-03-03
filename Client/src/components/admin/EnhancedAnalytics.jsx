import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function EnhancedAnalytics() {
  const [analyticsData, setAnalyticsData] = useState({
    userBehavior: {},
    salesFunnel: {},
    customerSegments: {},
    productPerformance: {},
    trafficSources: {},
    conversionRates: {},
    revenueAnalysis: {},
    customerLifetime: {}
  });
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulate API calls for different analytics data
      const data = await Promise.all([
        fetchUserBehaviorData(),
        fetchSalesFunnelData(),
        fetchCustomerSegmentData(),
        fetchProductPerformanceData(),
        fetchTrafficSourceData(),
        fetchConversionData(),
        fetchRevenueAnalysis(),
        fetchCustomerLifetimeData()
      ]);

      setAnalyticsData({
        userBehavior: data[0],
        salesFunnel: data[1],
        customerSegments: data[2],
        productPerformance: data[3],
        trafficSources: data[4],
        conversionRates: data[5],
        revenueAnalysis: data[6],
        customerLifetime: data[7]
      });
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data fetching functions
  const fetchUserBehaviorData = async () => {
    return {
      pageViews: generateTimeSeriesData(30, 1000, 5000),
      sessionDuration: generateTimeSeriesData(30, 120, 300),
      bounceRate: generateTimeSeriesData(30, 20, 60),
      pagesPerSession: generateTimeSeriesData(30, 2, 8),
      heatmapData: generateHeatmapData(),
      userFlow: generateUserFlowData()
    };
  };

  const fetchSalesFunnelData = async () => {
    return {
      stages: [
        { name: 'Visitors', count: 10000, percentage: 100 },
        { name: 'Product Views', count: 6500, percentage: 65 },
        { name: 'Add to Cart', count: 2800, percentage: 28 },
        { name: 'Checkout Started', count: 1200, percentage: 12 },
        { name: 'Payment', count: 950, percentage: 9.5 },
        { name: 'Purchase Complete', count: 850, percentage: 8.5 }
      ],
      dropoffReasons: [
        { reason: 'High shipping cost', percentage: 35 },
        { reason: 'Required registration', percentage: 25 },
        { reason: 'Payment issues', percentage: 20 },
        { reason: 'Long checkout process', percentage: 15 },
        { reason: 'Security concerns', percentage: 5 }
      ]
    };
  };

  const fetchCustomerSegmentData = async () => {
    return {
      segments: [
        { name: 'New Customers', count: 1250, revenue: 45000, avgOrderValue: 36 },
        { name: 'Regular Customers', count: 850, revenue: 125000, avgOrderValue: 147 },
        { name: 'VIP Customers', count: 120, revenue: 85000, avgOrderValue: 708 },
        { name: 'Inactive Customers', count: 2100, revenue: 15000, avgOrderValue: 7 }
      ],
      demographics: {
        age: [
          { range: '18-24', percentage: 15 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 28 },
          { range: '45-54', percentage: 15 },
          { range: '55+', percentage: 7 }
        ],
        location: [
          { country: 'United States', percentage: 45 },
          { country