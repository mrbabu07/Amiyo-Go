/**
 * EXAMPLE: How to integrate AdminDynamicCategories into your admin dashboard
 * 
 * This file shows different integration patterns you can use.
 */

// ============================================================================
// PATTERN 1: Simple Route Integration
// ============================================================================
// In your main App.jsx or routing file:

import AdminDynamicCategories from '@/pages/admin/AdminDynamicCategories';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function AppRoutes() {
  return (
    <Routes>
      {/* Other routes */}
      <Route path="/admin/categories" element={<AdminDynamicCategories />} />
    </Routes>
  );
}

// ============================================================================
// PATTERN 2: Protected Route with Admin Check
// ============================================================================
// Create a ProtectedAdminRoute component:

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function ProtectedAdminRoute({ element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !user.isAdmin) {
    return <Navigate to="/login" />;
  }

  return element;
}

// Then use it:
function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/admin/categories"
        element={<ProtectedAdminRoute element={<AdminDynamicCategories />} />}
      />
    </Routes>
  );
}

// ============================================================================
// PATTERN 3: Admin Dashboard Layout Integration
// ============================================================================
// In your AdminDashboard component:

import { useState } from 'react';
import AdminDynamicCategories from '@/pages/admin/AdminDynamicCategories';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white">
        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'categories' ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'products' ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            Products
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && <DashboardContent />}
        {activeTab === 'categories' && <AdminDynamicCategories />}
        {activeTab === 'products' && <ProductsContent />}
      </main>
    </div>
  );
}

// ============================================================================
// PATTERN 4: Nested Routes in Admin Section
// ============================================================================
// In your admin routing structure:

import { Outlet } from 'react-router-dom';

function AdminLayout() {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1">
        <Outlet /> {/* This renders the nested route component */}
      </div>
    </div>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="categories" element={<AdminDynamicCategories />} />
        <Route path="products" element={<AdminProducts />} />
      </Route>
    </Routes>
  );
}

// ============================================================================
// PATTERN 5: Admin Sidebar Component
// ============================================================================
// Create a reusable AdminSidebar:

import { Link, useLocation } from 'react-router-dom';

function AdminSidebar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      <nav className="space-y-2 px-4">
        <Link
          to="/admin/dashboard"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
            isActive('/admin/dashboard')
              ? 'bg-blue-600'
              : 'hover:bg-gray-800'
          }`}
        >
          <span>📊</span>
          <span>Dashboard</span>
        </Link>

        <Link
          to="/admin/categories"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
            isActive('/admin/categories')
              ? 'bg-blue-600'
              : 'hover:bg-gray-800'
          }`}
        >
          <span>📁</span>
          <span>Categories</span>
        </Link>

        <Link
          to="/admin/products"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
            isActive('/admin/products')
              ? 'bg-blue-600'
              : 'hover:bg-gray-800'
          }`}
        >
          <span>📦</span>
          <span>Products</span>
        </Link>

        <Link
          to="/admin/campaigns"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
            isActive('/admin/campaigns')
              ? 'bg-blue-600'
              : 'hover:bg-gray-800'
          }`}
        >
          <span>🎯</span>
          <span>Campaigns</span>
        </Link>
      </nav>
    </aside>
  );
}

// ============================================================================
// PATTERN 6: Tab-Based Admin Interface
// ============================================================================
// Using tabs instead of sidebar:

import { useState } from 'react';

function AdminTabs() {
  const [activeTab, setActiveTab] = useState('categories');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'categories', label: 'Categories', icon: '📁' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'campaigns', label: 'Campaigns', icon: '🎯' },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex border-b bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'categories' && <AdminDynamicCategories />}
        {activeTab === 'products' && <AdminProducts />}
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'campaigns' && <AdminCampaigns />}
      </div>
    </div>
  );
}

// ============================================================================
// PATTERN 7: Full Admin App Structure
// ============================================================================
// Complete example of admin app structure:

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Admin Pages
import AdminDynamicCategories from '@/pages/admin/AdminDynamicCategories';
import AdminDynamicProducts from '@/pages/admin/AdminDynamicProducts';
import AdminDashboard from '@/pages/admin/AdminDashboard';

// Admin Components
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

function AdminApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/categories" element={<AdminDynamicCategories />} />
            <Route path="/products" element={<AdminDynamicProducts />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default AdminApp;

// ============================================================================
// USAGE IN MAIN APP
// ============================================================================
// In your main App.jsx:

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
