# Amiyo-Go

Amiyo-Go is a web-based multi-vendor marketplace for Bangladesh. It supports three main roles:

- Customer: browse, buy, track, review, return
- Vendor: manage shop, products, orders, finance
- Admin: manage the marketplace, categories, vendors, moderation, payouts

This repository contains:

- `Client/` - React + Vite frontend
- `Server/` - Node.js + Express backend

## Project Scope

This project is currently a web application only.

- No Android app build
- No iOS app build
- PWA support is present for installable web usage

## Main Workflows

- Customer registration with Bangladesh address fields
- Category browsing, search, cart, checkout
- Delivery fee calculation and checkout confirmation
- Multi-vendor order placement and vendor order splitting
- 30-minute customer cancellation window
- Vendor onboarding, category access, product submission
- Admin product approval and category commission control
- Vendor payout requests and admin payout processing
- Notifications, support, returns, and reporting

For the full operational flow, read:

- [PROJECT_WORKFLOW.md](PROJECT_WORKFLOW.md)

For route-by-route features and current implementation notes, read:

- [FEATURE_REFERENCE.md](FEATURE_REFERENCE.md)

## Role Guides

- [README_USER.md](README_USER.md)
- [README_VENDOR.md](README_VENDOR.md)
- [README_ADMIN.md](README_ADMIN.md)

## Existing Technical Notes

- [DYNAMIC_SYSTEM_SUMMARY.md](DYNAMIC_SYSTEM_SUMMARY.md)
- [EDIT_ATTRIBUTES_LINK.md](EDIT_ATTRIBUTES_LINK.md)
- [Client/src/pages/admin/UI_FLOW_GUIDE.md](Client/src/pages/admin/UI_FLOW_GUIDE.md)
- [Client/src/pages/admin/README_CATEGORIES.md](Client/src/pages/admin/README_CATEGORIES.md)

## Local Run

### Prerequisites

- Node.js 18+
- MongoDB
- Firebase project for auth

### Install

```bash
npm install
```

### Start frontend and backend

Use your existing scripts or start each side separately from `Client/` and `Server/`.

If you use the bundled helper scripts:

- Windows: `install.bat`
- Linux/macOS: `install.sh`

## Recommended Reading Order

1. [PROJECT_WORKFLOW.md](PROJECT_WORKFLOW.md)
2. [FEATURE_REFERENCE.md](FEATURE_REFERENCE.md)
3. Role-specific guide for the team member using the system

## Notes

- Some features already have production-style workflows.
- Some integrations still use fallback or mock behavior when external providers are not configured, such as email/SMS or certain notification channels.
- The new documentation calls those out clearly so the project is easier to maintain.
