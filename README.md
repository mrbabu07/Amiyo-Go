# Amiyo-Go

Amiyo-Go is a web-based multi-vendor ecommerce marketplace built for Bangladesh-focused commerce, including village and semi-urban delivery workflows. The platform supports three main roles in one system:

- **Customer**: browse products, add to cart, checkout, track orders, review items, request returns
- **Vendor**: manage store profile, products, categories, orders, payouts, reports, and customer communication
- **Admin**: control categories, vendors, users, moderation, orders, delivery settings, commissions, payouts, and marketplace operations

This repository contains:

- `Client/` - React + Vite frontend
- `Server/` - Node.js + Express backend

## Overview

The project is designed as a **multi-vendor marketplace**, similar in structure to platforms like Daraz-style ecommerce, but adapted for local Bangladesh workflows:

- grouped category tree with main category -> section -> subcategory flow
- vendor-specific storefronts
- Bangladesh-specific address capture
- area-aware delivery fee calculation
- admin-controlled category commissions
- multi-vendor order splitting
- vendor payout and admin payout approval flows

This project is currently **web only**:

- no Android app build
- no iOS app build
- installable web usage through PWA support

## Core Roles

### Customer

Customers can:

- register and save a default address
- browse categories and products
- search and filter products
- add items from multiple vendors into one cart
- place orders with delivery fee calculation
- cancel eligible orders within 30 minutes
- track orders, review products, and request returns

### Vendor

Vendors can:

- register and get approved by admin
- receive one or more allowed main categories
- create products inside approved category trees
- manage pricing, stock, and product updates
- process orders and returns
- track earnings, commissions, and payouts
- configure bank or mobile banking payout details

### Admin

Admins can:

- manage grouped categories and attributes
- set commission rates and minimum commission floors
- approve or reject vendor products
- monitor vendor activity
- manage orders, users, vendors, reviews, and support
- control delivery settings and payout workflows

## Main Business Workflows

The current platform already includes these major workflows:

1. **Customer registration and address flow**
   - Bangladesh address fields such as division, district, upazila, union, ward, area, and house details
   - default address saved for checkout reuse

2. **Category and product browsing**
   - grouped category navigation
   - vendor storefronts
   - search, filters, and product detail pages

3. **Cart and checkout**
   - add products from one or more vendors
   - server-side delivery recalculation
   - coupon or voucher support
   - loyalty point redemption

4. **Multi-vendor order flow**
   - one customer order split into vendor-facing order records
   - item-level order status tracking
   - commission snapshot storage at order time

5. **Cancellation workflow**
   - customer can cancel within 30 minutes
   - vendor and admin views stay synced
   - stock is restored automatically

6. **Vendor product workflow**
   - vendor chooses approved category path
   - product goes to moderation
   - admin approves, rejects, or disables product

7. **Vendor finance workflow**
   - delivered items generate earnings
   - commission and vendor earning amounts are tracked
   - vendor payout requests and admin payout processing are supported

8. **Admin control workflow**
   - category management
   - commission management
   - vendor activity monitoring
   - payout oversight
   - delivery settings and operational controls

## Current Feature Snapshot

The project already has a strong core marketplace backbone.

### Strongly implemented areas

- customer registration and saved addresses
- grouped category system
- product listing and product detail
- cart and checkout
- delivery fee calculation
- multi-vendor order creation
- vendor dashboards and product management
- admin vendor and product moderation
- commission tracking
- payout history and payout control

### Areas that still need extra production hardening

- chat and support workflows
- some return and review moderation flows
- flash sales, offers, and coupon edge cases
- notification channels that depend on external providers
- some analytics, reporting, and vendor marketing surfaces

For the detailed route-by-route status, see [FEATURE_REFERENCE.md](FEATURE_REFERENCE.md).

## Project Structure

### Frontend

The frontend is built with:

- React
- Vite
- client-side routing
- role-based pages for customer, vendor, and admin

Main frontend areas:

- `Client/src/pages/`
- `Client/src/components/`
- `Client/src/services/`
- `Client/src/routes/`

### Backend

The backend is built with:

- Node.js
- Express
- MongoDB
- Firebase auth verification

Main backend areas:

- `Server/routes/`
- `Server/controllers/`
- `Server/models/`
- `Server/services/`

## Important System Rules

### Address logic

- user addresses support Bangladesh-specific delivery fields
- default address is reused in checkout
- alternate shipping address can be entered during checkout

### Commission logic

- category commission is resolved during order creation
- minimum commission floors can apply from parent categories
- commission is stored as order-item snapshot data so history stays stable

### Delivery logic

- delivery fees are recalculated on the server
- delivery breakdown is stored with the order
- local service area matching supports Bangladesh delivery rules

### Cancellation logic

- customer cancellation is limited to 30 minutes
- cancellation syncs to vendor-side order records
- stock restoration happens automatically

## Setup

### Prerequisites

- Node.js 18+
- MongoDB
- Firebase project for auth

### Install

```bash
npm install
```

### Run locally

You can start frontend and backend separately from `Client/` and `Server/`.

If you use the helper scripts:

- Windows: `install.bat`
- Linux/macOS: `install.sh`

## Documentation Guide

Start here if you want a fuller understanding of the system:

1. [PROJECT_WORKFLOW.md](PROJECT_WORKFLOW.md) - end-to-end system flow
2. [FEATURE_REFERENCE.md](FEATURE_REFERENCE.md) - feature status by route and role
3. Role-specific guides:
   - [README_USER.md](README_USER.md)
   - [README_VENDOR.md](README_VENDOR.md)
   - [README_ADMIN.md](README_ADMIN.md)

Additional technical notes:

- [DYNAMIC_SYSTEM_SUMMARY.md](DYNAMIC_SYSTEM_SUMMARY.md)
- [EDIT_ATTRIBUTES_LINK.md](EDIT_ATTRIBUTES_LINK.md)
- [Client/src/pages/admin/UI_FLOW_GUIDE.md](Client/src/pages/admin/UI_FLOW_GUIDE.md)
- [Client/src/pages/admin/README_CATEGORIES.md](Client/src/pages/admin/README_CATEGORIES.md)

## Current Notes

- The system already supports real marketplace-style workflows across customer, vendor, and admin roles.
- Some external integrations can still run in fallback or mock mode if provider credentials are not fully configured.
- Generated coverage files under `Server/coverage/` are reports, not source files, and usually should not be committed as part of feature work.

## Summary

Amiyo-Go is not just a storefront. It is a full multi-role ecommerce platform with:

- customer commerce flow
- vendor operations flow
- admin marketplace control flow
- category, commission, delivery, and payout logic

If you are onboarding to the project, read the workflow and feature reference docs next. They will give you the fastest path to understanding how the current implementation works.
