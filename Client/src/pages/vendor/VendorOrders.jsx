import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useCurrency } from '../../hooks/useCurrency';

const VendorOrders = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, filter]);

  const fetchOrders = async () => {
    try {
      const token = await user.getIdToken();
      const url = filter === 'all' 
        ? `${import.meta.env.VITE_API_URL}/vendors/orders`
        : `${import.meta.env.VITE_API_URL}/vendors/orders?status=${filter}`;
        
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setOrders(data.orders || []);
      } else {
        setError(data.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        alert('Order status updated successfully');
        fetchOrders();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
              <p className="text-gray-600">Manage your customer orders</p>
            </div>
            <Link
              to="/vendor/dashboard"
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-600">Orders will appear here when customers purchase your products</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Order #{order._id.slice(-8)}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('en-BD', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                {/* Order Items */}
                <div className="border-t border-b py-4 mb-4">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 py-2">
                      {item.productId?.images?.[0] && (
                        <img
                          src={item.productId.images[0]}
                          alt={item.productId.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.productId?.title || 'Product'}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-900">{formatPrice(item.price)}</p>
                    </div>
                  ))}
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium text-gray-900">{order.userId?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{order.userId?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivery Address</p>
                    <p className="font-medium text-gray-900">{order.shippingAddress?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{order.shippingAddress?.address || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{order.shippingAddress?.phone || 'N/A'}</p>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-lg font-bold text-gray-900">
                    Total: {formatPrice(order.totalAmount)}
                  </p>

                  {/* Status Update */}
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'processing')}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          Accept Order
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'shipped')}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                        >
                          Mark as Shipped
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'delivered')}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                        >
                          Mark as Delivered
                        </button>
                      )}
                      <button
                        onClick={() => updateOrderStatus(order._id, 'cancelled')}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorOrders;
