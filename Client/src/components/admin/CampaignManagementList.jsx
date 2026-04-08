import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CampaignManagementList = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchCampaigns();
  }, [filters]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/campaigns', { params: filters });
      setCampaigns(response.data.data || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const handleSearch = (e) => {
    const { value } = e.target;
    setFilters(prev => ({
      ...prev,
      search: value,
      page: 1,
    }));
  };

  const handlePublish = async (campaignId) => {
    try {
      await axios.post(`/api/campaigns/${campaignId}/publish`);
      fetchCampaigns();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to publish campaign');
    }
  };

  const handleEnd = async (campaignId) => {
    if (window.confirm('Are you sure you want to end this campaign?')) {
      try {
        await axios.post(`/api/campaigns/${campaignId}/end`);
        fetchCampaigns();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to end campaign');
      }
    }
  };

  const handleArchive = async (campaignId) => {
    if (window.confirm('Are you sure you want to archive this campaign?')) {
      try {
        await axios.post(`/api/campaigns/${campaignId}/archive`);
        fetchCampaigns();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to archive campaign');
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      Draft: 'badge-draft',
      Scheduled: 'badge-scheduled',
      Active: 'badge-active',
      Ended: 'badge-ended',
      Archived: 'badge-archived',
    };
    return <span className={`badge ${statusClasses[status]}`}>{status}</span>;
  };

  return (
    <div className="campaign-management">
      <div className="filters">
        <input
          type="text"
          name="search"
          placeholder="Search campaigns..."
          value={filters.search}
          onChange={handleSearch}
          className="search-input"
        />

        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Active">Active</option>
          <option value="Ended">Ended</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="no-data">No campaigns found</div>
      ) : (
        <>
          <div className="campaigns-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Discount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(campaign => (
                  <tr key={campaign._id}>
                    <td>
                      <strong>{campaign.name}</strong>
                      <br />
                      <small>{campaign.slug}</small>
                    </td>
                    <td>{getStatusBadge(campaign.status)}</td>
                    <td>{new Date(campaign.startDate).toLocaleDateString()}</td>
                    <td>{new Date(campaign.endDate).toLocaleDateString()}</td>
                    <td>{campaign.discountPercentage}%</td>
                    <td className="actions">
                      {campaign.status === 'Draft' && (
                        <button
                          onClick={() => handlePublish(campaign._id)}
                          className="btn-small btn-publish"
                        >
                          Publish
                        </button>
                      )}
                      {campaign.status === 'Active' && (
                        <button
                          onClick={() => handleEnd(campaign._id)}
                          className="btn-small btn-end"
                        >
                          End
                        </button>
                      )}
                      {campaign.status === 'Ended' && (
                        <button
                          onClick={() => handleArchive(campaign._id)}
                          className="btn-small btn-archive"
                        >
                          Archive
                        </button>
                      )}
                      <a href={`/admin/campaigns/${campaign._id}`} className="btn-small btn-edit">
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setFilters(prev => ({ ...prev, page }))}
                  className={`page-btn ${filters.page === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CampaignManagementList;
