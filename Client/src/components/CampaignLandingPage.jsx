import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CountdownTimer from './CountdownTimer';

const CampaignLandingPage = ({ slug }) => {
  const [campaign, setcampaign] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCampaign();
  }, [slug]);

  useEffect(() => {
    if (campaign) {
      recordView();
    }
  }, [campaign]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/campaigns/slug/${slug}`);
      const campaignData = response.data.data;

      // Check if campaign is active
      if (campaignData.status !== 'Active') {
        setError('This campaign is not currently available');
        return;
      }

      setcampaign(campaignData);
      fetchProducts(campaignData._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Campaign not found');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (campaignId) => {
    try {
      const response = await axios.get(`/api/campaigns/${campaignId}/products`);
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const recordView = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId') || `session-${Date.now()}`;
      if (!localStorage.getItem('sessionId')) {
        localStorage.setItem('sessionId', sessionId);
      }

      await axios.post(`/api/campaigns/${campaign._id}/view`, {
        sessionId,
        userId: localStorage.getItem('userId'),
      });
    } catch (err) {
      console.error('Failed to record view:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading campaign...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!campaign) {
    return <div className="error-message">Campaign not found</div>;
  }

  return (
    <div className="campaign-landing-page">
      <div className="campaign-header">
        <img src={campaign.bannerImageUrl} alt={campaign.name} className="banner-image" />
        <div className="campaign-info">
          <h1>{campaign.name}</h1>
          {campaign.description && <p className="description">{campaign.description}</p>}
          <CountdownTimer endDate={campaign.endDate} />
          <div className="discount-badge">
            <span className="discount-percentage">{campaign.discountPercentage}% OFF</span>
          </div>
        </div>
      </div>

      <div className="products-section">
        <h2>Campaign Products</h2>
        {products.length === 0 ? (
          <p className="no-products">No products available in this campaign</p>
        ) : (
          <div className="products-grid">
            {products.map(cp => (
              <div key={cp._id} className="product-card">
                <div className="product-image">
                  <img src={cp.product?.image} alt={cp.product?.name} />
                  <div className="discount-label">{campaign.discountPercentage}% OFF</div>
                </div>
                <div className="product-details">
                  <h3>{cp.product?.name}</h3>
                  <p className="sku">SKU: {cp.product?.sku}</p>
                  <div className="pricing">
                    <span className="original-price">৳{cp.basePrice}</span>
                    <span className="discounted-price">৳{cp.discountedPrice}</span>
                  </div>
                  <p className="vendor">By {cp.vendor?.name}</p>
                  <button className="btn-add-to-cart">Add to Cart</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignLandingPage;
