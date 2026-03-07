import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function AdminChatDetail() {
  const { vendorId } = useParams();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadChat();
    const interval = setInterval(loadChat, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [vendorId]);

  const loadChat = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/admin/chat/${vendorId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setChat(data.data);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!message.trim() && selectedFiles.length === 0) || sending) return;

    setSending(true);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('message', message);
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/admin/send/${vendorId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setMessage('');
        setSelectedFiles([]);
        loadChat();
        toast.success('Message sent');
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(file.name);
      const isDoc = /\.(pdf|doc|docx|txt|xls|xlsx)$/i.test(file.name);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isImage && !isDoc) {
        toast.error(`${file.name}: Only images and documents allowed`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (selectedFiles.length + validFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    setSelectedFiles([...selectedFiles, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/chats" className="text-white hover:text-blue-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{chat?.vendorName || 'Vendor'}</h1>
            <div className="flex items-center gap-4 text-sm text-blue-100">
              {chat?.vendorPhone && <span>📞 {chat.vendorPhone}</span>}
              {chat?.vendorEmail && <span>📧 {chat.vendorEmail}</span>}
            </div>
          </div>
          <Link
            to={`/admin/vendors/${vendorId}`}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition"
          >
            View Shop
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {!chat?.messages || chat.messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-600">Start the conversation with this vendor</p>
          </div>
        ) : (
          chat.messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                  msg.senderType === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">
                    {msg.senderType === 'admin' ? 'You (Admin)' : chat.vendorName}
                  </span>
                </div>
                {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.attachments.map((att, idx) => (
                      <div key={idx}>
                        {att.type === 'image' ? (
                          <a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${att.url}`} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${att.url}`} 
                              alt={att.name}
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition"
                              style={{ maxHeight: '200px' }}
                            />
                          </a>
                        ) : (
                          <a 
                            href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${att.url}`}
                            download={att.name}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                              msg.senderType === 'admin' 
                                ? 'bg-blue-700 hover:bg-blue-800' 
                                : 'bg-gray-100 hover:bg-gray-200'
                            } transition`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm">{att.name}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <p className={`text-xs mt-2 ${msg.senderType === 'admin' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {new Date(msg.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="bg-white border-t border-gray-200 p-4 shadow-lg">
        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                <span className="text-sm text-gray-700 truncate max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title="Attach files"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message to the vendor..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={(!message.trim() && selectedFiles.length === 0) || sending}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
          >
            {sending ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Send'
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: You can attach images and documents (max 5 files, 10MB each)
        </p>
      </form>
    </div>
  );
}
