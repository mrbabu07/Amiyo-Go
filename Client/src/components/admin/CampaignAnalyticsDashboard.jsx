import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CampaignAnalyticsDashboard = ({ campaignId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [viewMetrics, setViewMetrics] = useState(null);
  const [orderMetrics, setOrderMetrics] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [campaignId, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      const [analyticsRes, viewRes, orderRes, productsRes] = await Promise.all([
        axios.get(`/api/campaigns/${campaignId}/analytics`, { params }),
        axios.get(`/api/campaigns/${campaignId}/analytics/views`, { params }),
        axios.get(`/api/campaigns/${campaignId}/analytics/orders`, { params }),
        axios.get(`/api/campaigns/${campaignId}/analytics/top-products`, { params: { limit: 10 } }),
      ]);

      setAnalytics(analyticsRes.data.data);
      setViewMetrics(viewRes.data.data);
      setOrderMetrics(orderRes.data.data);
      setTopProducts(productsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`/api/campaigns/${campaignId}/analytics/export`, {
        params: dateRange,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `campaign-analytics-${campaignId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="error-message">Failed to load analytics</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h2>Campaign Analytics</h2>
        <div className="date-range">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          />
          <button onClick={handleExport} className="btn-export">
            Export CSV
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Views</h3>
          <p className="metric-value">{analytics.summary.totalViews}</p>
          <small>Unique: {analytics.summary.uniqueVisitors}</small>
        </div>

        <div className="metric-card">
          <h3>Total Orders</h3>
          <p className="metric-value">{analytics.summary.totalOrders}</p>
          <small>Conversion: {analytics.summary.conversionRate.toFixed(2)}%</small>
        </div>

        <div className="metric-card">
          <h3>Total Revenue</h3>
          <p className="metric-value">৳{analytics.summary.totalRevenue.toFixed(2)}</p>
          <small>Avg: ৳{analytics.summary.averageOrderValue.toFixed(2)}</small>
        </div>

        <div className="metric-card">
          <h3>Conversion Rate</h3>
          <p className="metric-value">{analytics.summary.conversionRate.toFixed(2)}%</p>
          <small>{analytics.summary.totalOrders} orders from {analytics.summary.totalViews} views</small>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h3>Daily Views Trend</h3>
          <div className="chart-placeholder">
            {viewMetrics?.dailyBreakdown.map(day => (
              <div key={day.date} className="chart-bar">
                <span className="date">{day.date}</span>
                <span className="value">{day.views}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container">
          <h3>Daily Revenue Trend</h3>
          <div className="chart-placeholder">
            {orderMetrics?.dailyBreakdown.map(day => (
              <div key={day.date} className="chart-bar">
                <span className="date">{day.date}</span>
                <span className="value">৳{day.revenue.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="top-products-section">
        <h3>Top 10 Products by Views</h3>
        {topProducts.length === 0 ? (
          <p>No products data available</p>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Views</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, index) => (
                <tr key={index}>
                  <td>{product.productName}</td>
                  <td>{product.viewCount}</td>
                  <td>৳{product.revenue?.toFixed(2) || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CampaignAnalyticsDashboard;
