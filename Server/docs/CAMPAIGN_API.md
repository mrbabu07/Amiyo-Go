# Campaign Manager API Documentation

## Overview

The Campaign Manager API provides endpoints for creating, managing, and tracking promotional campaigns on the e-commerce platform.

## Base URL

```
/api/campaigns
```

## Authentication

All admin endpoints require authentication with `verifyToken` and `verifyAdmin` middleware.

---

## Campaign Management Endpoints

### Create Campaign

**POST** `/api/campaigns`

Create a new campaign with Draft status.

**Request Body:**
```json
{
  "name": "Summer Sale 2024",
  "slug": "summer-sale-2024",
  "description": "Annual summer sale",
  "bannerImageUrl": "https://example.com/banner.jpg",
  "startDate": "2024-06-01T00:00:00Z",
  "endDate": "2024-06-30T23:59:59Z",
  "discountPercentage": 20,
  "eligibleCategories": ["cat1", "cat2"],
  "maxProductsPerVendor": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "_id": "campaign1",
    "name": "Summer Sale 2024",
    "status": "Draft",
    ...
  }
}
```

**Status Codes:**
- `201` - Campaign created successfully
- `400` - Validation error

---

### Get Campaign by ID

**GET** `/api/campaigns/:id`

Retrieve campaign details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "campaign1",
    "name": "Summer Sale 2024",
    "status": "Active",
    "discountPercentage": 20,
    ...
  }
}
```

**Status Codes:**
- `200` - Campaign retrieved successfully
- `404` - Campaign not found

---

### Get Campaign by Slug (Public)

**GET** `/api/campaigns/slug/:slug`

Retrieve campaign details by slug (public endpoint).

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "campaign1",
    "name": "Summer Sale 2024",
    "status": "Active",
    ...
  }
}
```

---

### List Campaigns

**GET** `/api/campaigns`

List all campaigns with filtering and pagination.

**Query Parameters:**
- `status` - Filter by status (Draft, Scheduled, Active, Ended, Archived)
- `search` - Search by name or slug
- `startDateFrom` - Filter campaigns starting from this date
- `startDateTo` - Filter campaigns starting until this date
- `sortBy` - Sort field (default: -createdAt)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

---

### Update Campaign

**PUT** `/api/campaigns/:id`

Update a Draft campaign.

**Request Body:**
```json
{
  "name": "Updated Campaign Name",
  "discountPercentage": 25,
  ...
}
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign updated successfully",
  "data": {...}
}
```

**Status Codes:**
- `200` - Campaign updated successfully
- `400` - Only Draft campaigns can be updated

---

### Publish Campaign

**POST** `/api/campaigns/:id/publish`

Publish a Draft campaign (transitions to Active or Scheduled).

**Response:**
```json
{
  "success": true,
  "message": "Campaign published successfully",
  "data": {
    "status": "Active" or "Scheduled",
    ...
  }
}
```

---

### End Campaign

**POST** `/api/campaigns/:id/end`

Manually end an Active campaign.

**Response:**
```json
{
  "success": true,
  "message": "Campaign ended successfully",
  "data": {
    "status": "Ended",
    ...
  }
}
```

---

### Archive Campaign

**POST** `/api/campaigns/:id/archive`

Archive an Ended campaign.

**Response:**
```json
{
  "success": true,
  "message": "Campaign archived successfully",
  "data": {
    "status": "Archived",
    ...
  }
}
```

---

## Campaign Products Endpoints

### Add Products to Campaign

**POST** `/api/campaigns/:id/products`

Add products to a campaign.

**Request Body:**
```json
{
  "productIds": ["prod1", "prod2", "prod3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Products added to campaign",
  "data": [...]
}
```

---

### Remove Product from Campaign

**DELETE** `/api/campaigns/:id/products/:productId`

Remove a product from a campaign.

**Response:**
```json
{
  "success": true,
  "message": "Product removed from campaign"
}
```

---

### Get Campaign Products

**GET** `/api/campaigns/:id/products`

List all products in a campaign.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

---

## Campaign Analytics Endpoints

### Get Campaign Analytics

**GET** `/api/campaigns/:id/analytics`

Get comprehensive analytics summary.

**Query Parameters:**
- `startDate` - Start date for analytics
- `endDate` - End date for analytics

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalViews": 5000,
      "uniqueVisitors": 3000,
      "totalOrders": 150,
      "totalRevenue": 45000,
      "averageOrderValue": 300,
      "conversionRate": 3.0
    },
    "dailyBreakdown": [...]
  }
}
```

---

### Get View Metrics

**GET** `/api/campaigns/:id/analytics/views`

Get view metrics and trends.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 5000,
    "uniqueVisitors": 3000,
    "dailyBreakdown": [
      {
        "date": "2024-06-01",
        "views": 500,
        "uniqueVisitors": 300
      }
    ]
  }
}
```

---

### Get Order Metrics

**GET** `/api/campaigns/:id/analytics/orders`

Get order metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 150,
    "totalRevenue": 45000,
    "totalDiscount": 9000,
    "averageOrderValue": 300,
    "dailyBreakdown": [...]
  }
}
```

---

### Get Top Products

**GET** `/api/campaigns/:id/analytics/top-products`

Get top performing products.

**Query Parameters:**
- `metric` - Sort by 'views' or 'revenue' (default: views)
- `limit` - Number of products to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "prod1",
      "productName": "Product Name",
      "viewCount": 500,
      "revenue": 5000
    }
  ]
}
```

---

### Export Analytics

**GET** `/api/campaigns/:id/analytics/export`

Export analytics as CSV.

**Query Parameters:**
- `startDate` - Start date
- `endDate` - End date

**Response:** CSV file download

---

## Campaign Landing Page Endpoints

### Record Campaign View

**POST** `/api/campaigns/:id/view`

Record a campaign view (public endpoint).

**Request Body:**
```json
{
  "sessionId": "session-123",
  "userId": "user-456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "View recorded"
}
```

---

## Campaign Audit Endpoints

### Get Audit Logs

**GET** `/api/campaigns/:id/audit-logs`

Get campaign audit trail.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `action` - Filter by action type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "log1",
      "action": "CREATE",
      "adminUser": {...},
      "timestamp": "2024-06-01T10:00:00Z",
      ...
    }
  ],
  "pagination": {...}
}
```

---

### Export Audit Logs

**GET** `/api/campaigns/:id/audit-logs/export`

Export audit logs as CSV.

**Response:** CSV file download

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (admin access required)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- Admin endpoints: 100 requests per minute
- Public endpoints: 1000 requests per minute

---

## Pagination

All list endpoints support pagination with the following parameters:

- `page` - Page number (1-indexed)
- `limit` - Items per page (1-100, default: 10)

Response includes pagination metadata:

```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

---

## Date Format

All dates should be in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

Example: `2024-06-01T10:30:00Z`

---

## Examples

### Create and Publish a Campaign

```bash
# 1. Create campaign
curl -X POST http://localhost:5000/api/campaigns \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Sale",
    "slug": "summer-sale",
    "bannerImageUrl": "https://example.com/banner.jpg",
    "startDate": "2024-06-01T00:00:00Z",
    "endDate": "2024-06-30T23:59:59Z",
    "discountPercentage": 20,
    "eligibleCategories": ["cat1"]
  }'

# 2. Add products
curl -X POST http://localhost:5000/api/campaigns/CAMPAIGN_ID/products \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": ["prod1", "prod2"]
  }'

# 3. Publish campaign
curl -X POST http://localhost:5000/api/campaigns/CAMPAIGN_ID/publish \
  -H "Authorization: Bearer TOKEN"
```

### Get Campaign Analytics

```bash
curl -X GET "http://localhost:5000/api/campaigns/CAMPAIGN_ID/analytics?startDate=2024-06-01&endDate=2024-06-30" \
  -H "Authorization: Bearer TOKEN"
```

---

## Support

For issues or questions, contact the development team.
