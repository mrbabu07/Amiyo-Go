import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function AdminVendorChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const loadChats = async () => {
    try {
      const token = await user.getIdToken();
      const url = `${import.meta.env.VITE_API_URL}/chat/admin/chats?unreadOnly=${filter === 'unread'}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">💬 Vendor Messages</h1>
          <p className="text-sm text-gray-500 mt-1">Chat with vendors about their shops and issues</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex gap-2 p-4 border-b">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Chats ({chats.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread Only
            </button>
          </div>

          {/* Chats List */}
          <div className="divide-y">
            {chats.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {filter === 'unread' ? 'No unread messages' : 'No chats yet'}
                </h3>
                <p className="text-gray-600">
                  {filter === 'unread' 
                    ? 'All caught up! No vendors need your attention right now.'
                    : 'Vendors will appear here when they start a conversation'}
                </p>
              </div>
            ) : (
              chats.map((chat) => {
                const lastMessage = chat.messages[chat.messages.length - 1];
                return (
                  <Link
                    key={chat._id}
                    to={`/admin/chat/${chat.vendorId}`}
                    className="block p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900">{chat.vendorName}</h3>
                          {chat.hasUnreadAdmin && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          📞 {chat.vendorPhone} • 📧 {chat.vendorEmail}
                        </p>
                        {lastMessage && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">
                              {lastMessage.senderType === 'admin' ? 'You:' : 'Vendor:'}
                            </span>
                            <p className="text-sm text-gray-600 truncate">
                              {lastMessage.message.substring(0, 80)}
                              {lastMessage.message.length > 80 && '...'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500">
                          {new Date(chat.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {chat.messages.length} messages
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
