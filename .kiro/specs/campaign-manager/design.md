# Campaign Manager - Technical Design Document

## Overview

The Campaign Manager is a comprehensive system for creating, managing, and tracking promotional campaigns on the e-commerce platform. It provides administrators with tools to define campaign parameters, manage product eligibility, display campaigns to customers, and track detailed analytics including views, orders, and revenue.

The system is built on a modular architecture with clear separation between campaign lifecycle management, analytics tracking, product management, and customer-facing features. It integrates with existing product, order, and user systems while maintaining data integrity through audit logging and business rule enforcement.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  (React Components: CampaignForm, LandingPage, Dashboard)   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     API Layer                                │
│  (REST Endpoints: /campaigns, /analytics, /products)        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  Service Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │CampaignSvc   │  │AnalyticsSvc  │  │SchedulerSvc  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  Data Layer                                  │
│  (PostgreSQL: campaigns, analytics, audit logs)             │
│  (Redis: caching, real-time metrics)                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Campaign Service**: Manages campaign CRUD operations, lifecycle transitions, and business rule validation
2. **Analytics Service**: Tracks views, orders, revenue, and generates performance metrics
3. **Scheduler Service**: Handles automatic status transitions and scheduled tasks
4. **Product Manager**: Manages campaign product eligibility and vendor constraints
5. **Discount Calculator**: Computes and applies campaign discounts
6. **Audit Logger**: Records all campaign changes for compliance

## Components and Interfaces

### Backend Services

#### CampaignService
Responsibilities:
- Create, read, update, delete campaigns
- Manage campaign lifecycle (Draft → Scheduled/Active → Ended → Archived)
- Validate business rules and constraints
- Handle campaign publication and archival

Key Methods:
```
createCampaign(campaignData) → Campaign
updateCampaign(campaignId, updates) → Campaign
publishCampaign(campaignId) → Campaign
endCampaign(campaignId) → Campaign
archiveCampaign(campaignId) → Campaign
getCampaign(campaignId) → Campaign
listCampaigns(filters, pagination) → Campaign[]
validateCampaignRules(campaign) → ValidationResult
```

#### CampaignAnalyticsService
Responsibilities:
- Record view events
- Track order attribution
- Calculate performance metrics
- Generate analytics reports

Key Methods:
```
recordView(campaignId, sessionId, timestamp) → void
recordOrder(campaignId, orderId, revenue) → void
getAnalytics(campaignId, dateRange) → AnalyticsData
getViewTrend(campaignId, dateRange) → DailyMetrics[]
getOrderMetrics(campaignId) → OrderMetrics
getTopProducts(campaignId, limit) → Product[]
getConversionRate(campaignId) → number
exportAnalytics(campaignId) → CSV
```

#### CampaignSchedulerService
Responsibilities:
- Auto-activate scheduled campaigns
- Auto-end expired campaigns
- Trigger notifications
- Aggregate analytics

Key Methods:
```
processScheduledCampaigns() → void
processExpiredCampaigns() → void
sendCampaignNotifications() → void
aggregateAnalytics() → void
checkPerformanceThresholds() → void
```

#### ProductManagerService
Responsibilities:
- Manage campaign product eligibility
- Enforce vendor constraints
- Validate category eligibility

Key Methods:
```
addProductsToCampaign(campaignId, productIds) → void
removeProductFromCampaign(campaignId, productId) → void
validateProductEligibility(campaignId, productId) → boolean
checkVendorLimit(campaignId, vendorId) → boolean
getEligibleProducts(campaignId) → Product[]
```

#### DiscountCalculatorService
Responsibilities:
- Calculate discounted prices
- Handle multiple campaign overlaps
- Apply discounts at checkout

Key Methods:
```
calculateDiscountedPrice(basePrice, discountPercentage) → number
getApplicableCampaigns(productId, timestamp) → Campaign[]
getHighestDiscount(campaigns) → Campaign
applyDiscount(orderItems) → OrderItem[]
```

### Frontend Components

#### CampaignForm
- Campaign creation and editing
- Form validation
- Image upload handling
- Date range picker
- Category multi-select

#### CampaignLandingPage
- Campaign details display
- Countdown timer (real-time updates)
- Product grid with discounted prices
- Add to cart functionality
- View tracking

#### CampaignAnalyticsDashboard
- Real-time metrics display
- View/order/revenue trends
- Top products list
- Performance threshold indicators
- Export functionality

#### CampaignManagementList
- Campaign listing with filters
- Status-based filtering
- Search functionality
- Bulk actions
- Performance sorting

#### CountdownTimer
- Real-time countdown display
- Auto-update every second
- Status transition handling
- Responsive design

## Data Models

### Campaign
```
{
  id: UUID (primary key)
  name: string (required, max 255)
  slug: string (required, unique, max 100)
  description: string (optional, max 1000)
  bannerImageUrl: string (required)
  bannerImageKey: string (S3 key for storage)
  startDate: timestamp (required)
  endDate: timestamp (required)
  discountPercentage: number (5-100, required)
  status: enum (Draft, Scheduled, Active, Ended, Archived)
  eligibleCategories: UUID[] (required, min 1)
  maxProductsPerVendor: number (1-1000, default 100)
  minViewsThreshold: number (optional)
  minOrdersThreshold: number (optional)
  minRevenueThreshold: number (optional)
  createdBy: UUID (admin user ID)
  createdAt: timestamp
  updatedAt: timestamp
  updatedBy: UUID (admin user ID)
}
```

### CampaignProduct
```
{
  id: UUID (primary key)
  campaignId: UUID (foreign key)
  productId: UUID (foreign key)
  vendorId: UUID (foreign key)
  basePrice: decimal (required)
  discountedPrice: decimal (calculated)
  addedAt: timestamp
  addedBy: UUID (admin user ID)
}
```

### CampaignView
```
{
  id: UUID (primary key)
  campaignId: UUID (foreign key)
  sessionId: string (customer session)
  userId: UUID (optional, if logged in)
  viewedAt: timestamp
  ipAddress: string (for analytics)
}
```

### CampaignOrder
```
{
  id: UUID (primary key)
  campaignId: UUID (foreign key)
  orderId: UUID (foreign key)
  totalRevenue: decimal
  discountAmount: decimal
  orderDate: timestamp
  orderStatus: string
}
```

### CampaignAnalytics (Aggregated)
```
{
  id: UUID (primary key)
  campaignId: UUID (foreign key)
  date: date (for daily aggregation)
  totalViews: number
  uniqueVisitors: number
  totalOrders: number
  totalRevenue: decimal
  averageOrderValue: decimal
  conversionRate: number (percentage)
  lastUpdated: timestamp
}
```

### CampaignAuditLog
```
{
  id: UUID (primary key)
  campaignId: UUID (foreign key)
  action: enum (CREATE, UPDATE, PUBLISH, END, ARCHIVE, DELETE_PRODUCT)
  adminUserId: UUID
  fieldName: string (optional, for UPDATE actions)
  oldValue: string (optional)
  newValue: string (optional)
  timestamp: timestamp
  details: JSON (additional context)
}
```

### CampaignNotification
```
{
  id: UUID (primary key)
  campaignId: UUID (foreign key)
  recipientId: UUID (admin user ID)
  type: enum (MILESTONE, ALERT, PERFORMANCE, ENDING_SOON)
  message: string
  isRead: boolean
  createdAt: timestamp
  readAt: timestamp (optional)
}
```

## Database Schema

### campaigns table
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  banner_image_url VARCHAR(500) NOT NULL,
  banner_image_key VARCHAR(500),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  discount_percentage NUMERIC(5,2) NOT NULL CHECK (discount_percentage >= 5 AND discount_percentage <= 100),
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Active', 'Ended', 'Archived')),
  eligible_categories UUID[] NOT NULL,
  max_products_per_vendor INTEGER NOT NULL DEFAULT 100 CHECK (max_products_per_vendor >= 1 AND max_products_per_vendor <= 1000),
  min_views_threshold INTEGER,
  min_orders_threshold INTEGER,
  min_revenue_threshold DECIMAL(12,2),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID NOT NULL REFERENCES users(id),
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT min_duration CHECK (end_date - start_date >= INTERVAL '1 day'),
  CONSTRAINT max_duration CHECK (end_date - start_date <= INTERVAL '365 days')
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_slug ON campaigns(slug);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
```

### campaign_products table
```sql
CREATE TABLE campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  base_price DECIMAL(12,2) NOT NULL,
  discounted_price DECIMAL(12,2) NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by UUID NOT NULL REFERENCES users(id),
  UNIQUE(campaign_id, product_id)
);

CREATE INDEX idx_campaign_products_campaign ON campaign_products(campaign_id);
CREATE INDEX idx_campaign_products_vendor ON campaign_products(campaign_id, vendor_id);
CREATE INDEX idx_campaign_products_product ON campaign_products(product_id);
```

### campaign_views table
```sql
CREATE TABLE campaign_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id),
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address INET
);

CREATE INDEX idx_campaign_views_campaign ON campaign_views(campaign_id);
CREATE INDEX idx_campaign_views_date ON campaign_views(campaign_id, viewed_at);
CREATE INDEX idx_campaign_views_session ON campaign_views(session_id);
```

### campaign_orders table
```sql
CREATE TABLE campaign_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  total_revenue DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL,
  order_date TIMESTAMP NOT NULL,
  order_status VARCHAR(50),
  UNIQUE(campaign_id, order_id)
);

CREATE INDEX idx_campaign_orders_campaign ON campaign_orders(campaign_id);
CREATE INDEX idx_campaign_orders_date ON campaign_orders(campaign_id, order_date);
```

### campaign_analytics table
```sql
CREATE TABLE campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL,
  total_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  average_order_value DECIMAL(12,2),
  conversion_rate NUMERIC(5,2),
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, analytics_date)
);

CREATE INDEX idx_campaign_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_date ON campaign_analytics(analytics_date);
```

### campaign_audit_logs table
```sql
CREATE TABLE campaign_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details JSONB
);

CREATE INDEX idx_audit_logs_campaign ON campaign_audit_logs(campaign_id);
CREATE INDEX idx_audit_logs_timestamp ON campaign_audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON campaign_audit_logs(action);
```

### campaign_notifications table
```sql
CREATE TABLE campaign_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_notifications_recipient ON campaign_notifications(recipient_id);
CREATE INDEX idx_notifications_campaign ON campaign_notifications(campaign_id);
```

## API Endpoints

### Campaign Management

**POST /api/campaigns**
- Create a new campaign
- Request: CampaignCreateRequest
- Response: Campaign
- Auth: Admin only

**GET /api/campaigns/:id**
- Retrieve campaign details
- Response: Campaign
- Auth: Admin or public (if Active)

**PUT /api/campaigns/:id**
- Update campaign (Draft only)
- Request: CampaignUpdateRequest
- Response: Campaign
- Auth: Admin only

**GET /api/campaigns**
- List campaigns with filters
- Query: status, dateRange, search, sortBy, page, limit
- Response: Campaign[]
- Auth: Admin only

**POST /api/campaigns/:id/publish**
- Publish campaign (Draft → Scheduled/Active)
- Response: Campaign
- Auth: Admin only

**POST /api/campaigns/:id/end**
- End campaign manually
- Response: Campaign
- Auth: Admin only

**POST /api/campaigns/:id/archive**
- Archive campaign
- Response: Campaign
- Auth: Admin only

### Campaign Products

**POST /api/campaigns/:id/products**
- Add products to campaign
- Request: { productIds: UUID[] }
- Response: CampaignProduct[]
- Auth: Admin only

**DELETE /api/campaigns/:id/products/:productId**
- Remove product from campaign
- Response: { success: boolean }
- Auth: Admin only

**GET /api/campaigns/:id/products**
- List campaign products
- Query: page, limit, sortBy
- Response: CampaignProduct[]
- Auth: Admin or public (if Active)

### Campaign Analytics

**GET /api/campaigns/:id/analytics**
- Get campaign analytics summary
- Query: dateRange
- Response: AnalyticsData
- Auth: Admin only

**GET /api/campaigns/:id/analytics/views**
- Get view metrics and trends
- Query: dateRange, groupBy (daily/hourly)
- Response: ViewMetrics
- Auth: Admin only

**GET /api/campaigns/:id/analytics/orders**
- Get order metrics
- Query: dateRange
- Response: OrderMetrics
- Auth: Admin only

**GET /api/campaigns/:id/analytics/top-products**
- Get top performing products
- Query: limit, metric (views/revenue)
- Response: Product[]
- Auth: Admin only

**GET /api/campaigns/:id/analytics/export**
- Export analytics as CSV
- Query: dateRange, format
- Response: CSV file
- Auth: Admin only

### Campaign Landing Page

**GET /api/campaigns/slug/:slug**
- Get campaign by slug (public endpoint)
- Response: Campaign + Products
- Auth: Public

**POST /api/campaigns/:id/view**
- Record campaign view
- Request: { sessionId, userId? }
- Response: { success: boolean }
- Auth: Public

### Campaign Audit

**GET /api/campaigns/:id/audit-logs**
- Get campaign audit trail
- Query: page, limit, action
- Response: AuditLog[]
- Auth: Admin only

**GET /api/campaigns/:id/audit-logs/export**
- Export audit logs as CSV
- Response: CSV file
- Auth: Admin only

## External Integrations

### Image Storage (AWS S3)
- Store banner images in S3
- Generate signed URLs for display
- Implement image validation and optimization
- Cleanup on campaign deletion

### Email Notifications
- Send campaign milestone notifications
- Send performance alerts
- Send campaign ending soon reminders
- Integration with existing email service

### Analytics Events
- Track campaign views in analytics system
- Track campaign orders in analytics system
- Integrate with existing event tracking

## Caching Strategy

### Redis Cache Keys

```
campaign:{campaignId} → Campaign object (TTL: 5 min)
campaign:slug:{slug} → Campaign ID (TTL: 5 min)
campaign:{campaignId}:products → Product list (TTL: 10 min)
campaign:{campaignId}:analytics:daily → Daily metrics (TTL: 1 min)
campaign:{campaignId}:views:count → View count (TTL: 30 sec)
campaign:active → List of active campaigns (TTL: 5 min)
campaign:scheduled → List of scheduled campaigns (TTL: 5 min)
```

### Cache Invalidation
- Invalidate on campaign update
- Invalidate on product addition/removal
- Invalidate analytics on view/order recording
- Batch invalidation for scheduler tasks

### Real-Time Metrics
- Use Redis counters for view counts
- Aggregate to database every 5 minutes
- Use Redis sorted sets for top products

## Background Jobs

### Scheduler Tasks (Run every minute)

**ProcessScheduledCampaigns**
- Check for campaigns with start_date <= now
- Transition from Scheduled to Active
- Clear cache
- Send activation notifications

**ProcessExpiredCampaigns**
- Check for campaigns with end_date <= now
- Transition from Active to Ended
- Stop applying discounts
- Send ending notifications

**AggregateAnalytics** (Run every 5 minutes)
- Aggregate Redis view counts to database
- Calculate daily metrics
- Update conversion rates
- Update cache

**CheckPerformanceThresholds** (Run every 30 minutes)
- Check if campaigns meet performance thresholds
- Send alerts for at-risk campaigns
- Send positive notifications for exceeding campaigns

**SendNotifications** (Run every 10 minutes)
- Send pending notifications
- Mark as sent
- Retry failed notifications

**CleanupExpiredData** (Run daily at 2 AM)
- Archive old analytics data
- Delete old audit logs (retention: 2 years)
- Cleanup temporary files

## Error Handling

### Validation Errors
- Invalid date ranges
- Duplicate slugs
- Invalid discount percentages
- Missing required fields
- Invalid image formats/sizes

### Business Rule Violations
- Overlapping campaigns for same category
- Vendor product limit exceeded
- Campaign with zero eligible products
- Attempting to modify Active campaign discount

### Operational Errors
- Database connection failures
- S3 upload failures
- Cache failures (fallback to database)
- Email delivery failures (retry queue)

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Campaign slug already exists",
    "details": {
      "field": "slug",
      "value": "summer-sale-2024"
    }
  }
}
```





## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Campaign Creation Stores Draft Status

For any valid campaign creation request with all required fields, the created campaign should have status "Draft" and be retrievable by its ID.

**Validates: Requirements 1.2**

### Property 2: Duplicate Slug Rejection

For any campaign with an existing slug, attempting to create another campaign with the same slug should be rejected with a validation error.

**Validates: Requirements 1.3**

### Property 3: Image Validation

For any banner image upload, images with invalid formats (not JPEG, PNG, or WebP) or size exceeding 5MB should be rejected with a descriptive error message.

**Validates: Requirements 1.4**

### Property 4: Date Range Validation

For any campaign creation request where end_date is not after start_date, the request should be rejected with a validation error.

**Validates: Requirements 1.5**

### Property 5: Slug Generation

For any campaign created without an explicit slug, a URL-friendly slug should be automatically generated from the campaign name that contains only lowercase letters, numbers, and hyphens.

**Validates: Requirements 1.6**

### Property 6: Discount Percentage Range

For any discount percentage value outside the range [5, 100], the campaign configuration should be rejected with a validation error.

**Validates: Requirements 2.1, 2.3**

### Property 7: Multiple Category Selection

For any campaign configured with multiple eligible categories, all selected categories should be stored and retrievable as part of the campaign configuration.

**Validates: Requirements 2.2**

### Property 8: Category-Based Discount Application

For any product not in the campaign's eligible categories, the campaign discount should not be applied to that product's price.

**Validates: Requirements 2.4**

### Property 9: Draft Campaign Modification

For any Draft campaign, modifications to discount rules should be allowed without restrictions and should be immediately reflected in the campaign data.

**Validates: Requirements 2.5**

### Property 10: Active Campaign Modification Logging

For any modification to an Active campaign's discount rules, an audit log entry should be created with the admin user ID, timestamp, field name, old value, and new value.

**Validates: Requirements 2.6**

### Property 11: Vendor Limit Range Validation

For any max_products_per_vendor value outside the range [1, 1000], the campaign configuration should be rejected with a validation error.

**Validates: Requirements 3.1**

### Property 12: Vendor Product Limit Enforcement

For any vendor attempting to add products to a campaign, if the vendor already has max_products_per_vendor products in that campaign, the addition should be rejected.

**Validates: Requirements 3.2**

### Property 13: Prospective Limit Application

For any modification to max_products_per_vendor, the new limit should apply to future product additions but should not retroactively remove already-added products.

**Validates: Requirements 3.4**

### Property 14: Constraint Violation Logging

For any vendor that has products exceeding the new max_products_per_vendor limit after a limit reduction, a warning should be logged and the admin should be notified.

**Validates: Requirements 3.5**

### Property 15: Countdown Timer Display

For any active campaign, the countdown timer should display the correct remaining time (days, hours, minutes, seconds) until the campaign end date.

**Validates: Requirements 4.2**

### Property 16: Campaign Status Transition at End Time

For any campaign where the current time reaches or exceeds the end_date, the campaign status should automatically transition to "Ended" and the countdown timer should be replaced with an "Campaign Ended" message.

**Validates: Requirements 4.3**

### Property 17: Eligible Products Display with Discounts

For any eligible product in an active campaign, the campaign landing page should display the product with a discounted price calculated as: base_price × (1 - discount_percentage / 100).

**Validates: Requirements 4.4**

### Property 18: View Count Increment

For any customer viewing an active campaign landing page, the campaign's view count should increment by exactly 1.

**Validates: Requirements 4.5**

### Property 19: Non-Active Campaign Visibility

For any campaign with status Draft or Scheduled, accessing the campaign landing page should return a 404 or redirect, preventing customer visibility.

**Validates: Requirements 4.6**

### Property 20: Checkout Discount Application

For any campaign product added to a customer's cart, the campaign discount should be automatically applied at checkout and reflected in the order total.

**Validates: Requirements 4.7**

### Property 21: View Event Recording

For any customer viewing an active campaign landing page, a view event should be recorded with the campaign ID, session ID, and timestamp.

**Validates: Requirements 5.1**

### Property 22: View Count Aggregation

For any campaign, the total view count displayed in analytics should equal the count of all recorded view events for that campaign.

**Validates: Requirements 5.2**

### Property 23: Daily View Breakdown

For any campaign, the daily view trend should show the correct view count for each date, with the sum of daily views equaling the total view count.

**Validates: Requirements 5.3**

### Property 24: Unique Visitor Counting

For any campaign, the unique visitor count should equal the number of distinct session IDs in the view events for that campaign.

**Validates: Requirements 5.4**

### Property 25: Top Products Ranking

For any campaign, the top 10 most-viewed products should be ranked by view count in descending order.

**Validates: Requirements 5.5**

### Property 26: Order Recording

For any order containing campaign products, an order record should be created with the campaign ID, order ID, total revenue, and timestamp.

**Validates: Requirements 6.1**

### Property 27: Order Count Aggregation

For any campaign, the total order count displayed in analytics should equal the count of all recorded orders for that campaign.

**Validates: Requirements 6.2**

### Property 28: Revenue Calculation

For any campaign, the total revenue displayed in analytics should equal the sum of all order revenues for that campaign.

**Validates: Requirements 6.3**

### Property 29: Average Order Value Calculation

For any campaign with orders, the average order value should equal total revenue divided by total order count.

**Validates: Requirements 6.4**

### Property 30: Conversion Rate Calculation

For any campaign, the conversion rate should equal (total orders / total views) × 100, expressed as a percentage.

**Validates: Requirements 6.5**

### Property 31: Daily Revenue Breakdown

For any campaign, the daily revenue trend should show the correct revenue for each date, with the sum of daily revenues equaling the total revenue.

**Validates: Requirements 6.6**

### Property 32: Top Products by Revenue

For any campaign, the top 10 best-selling products should be ranked by revenue in descending order.

**Validates: Requirements 6.7**

### Property 33: Campaign Publication Validation

For any Draft campaign publication request, if all required fields (name, slug, dates, discount, categories) are present and valid, the campaign should transition to Active (if current time is within dates) or Scheduled (if start date is in future).

**Validates: Requirements 7.1, 7.2**

### Property 34: Automatic Campaign Activation

For any Scheduled campaign where the current time reaches or exceeds the start_date, the campaign status should automatically transition to "Active".

**Validates: Requirements 7.2**

### Property 35: Automatic Campaign Ending

For any Active campaign where the current time reaches or exceeds the end_date, the campaign status should automatically transition to "Ended".

**Validates: Requirements 7.3**

### Property 36: Campaign Archival

For any Ended campaign, archiving should transition the status to "Archived" and remove it from active campaign listings.

**Validates: Requirements 7.4**

### Property 37: Active Campaign Deletion Prevention

For any Active campaign, attempting to delete it should be rejected with an error message.

**Validates: Requirements 7.5**

### Property 38: Manual Campaign Ending

For any campaign, manually ending it should immediately transition the status to "Ended" and stop applying discounts to new orders.

**Validates: Requirements 7.6**

### Property 39: Campaign Duration Validation

For any campaign creation request, if the duration (end_date - start_date) is less than 1 day or greater than 365 days, the request should be rejected.

**Validates: Requirements 8.1**

### Property 40: Minimum Category Requirement

For any campaign configuration with zero eligible categories, the campaign should not be allowed to transition to Active status.

**Validates: Requirements 8.2**

### Property 41: Minimum Discount Enforcement

For any campaign configuration with a discount percentage less than 5%, the configuration should be rejected.

**Validates: Requirements 8.3**

### Property 42: Overlapping Campaign Prevention

For any product category, if an active campaign exists for that category during a given time period, no other campaign should be allowed to be active for the same category during that period.

**Validates: Requirements 8.4**

### Property 43: Zero Product Campaign Prevention

For any campaign with zero eligible products, attempting to transition to Active status should be rejected with a warning message.

**Validates: Requirements 8.5**

### Property 44: Cost Floor Protection

For any campaign product where cost data is available, the discounted price should not fall below the product's cost.

**Validates: Requirements 8.6**

### Property 45: Campaign Product List Display

For any campaign, the product list should display all products currently included in the campaign with their name, SKU, base price, discounted price, and vendor name.

**Validates: Requirements 9.1, 9.5**

### Property 46: Product Addition Validation

For any product addition to a campaign, the product should belong to an eligible category and the vendor should not exceed the max_products_per_vendor limit.

**Validates: Requirements 9.2, 9.4**

### Property 47: Product Removal Logging

For any product removal from a campaign, an audit log entry should be created with the admin user ID, timestamp, and product details.

**Validates: Requirements 9.3**

### Property 48: Analytics Export Round Trip

For any campaign analytics export to CSV, the exported data should be parseable and contain all campaign metrics (views, orders, revenue, conversion rate).

**Validates: Requirements 10.1**

### Property 49: Product Export Round Trip

For any campaign product export to CSV, the exported data should be parseable and contain all campaign products with pricing and vendor information.

**Validates: Requirements 10.2, 10.3**

### Property 50: Export Metadata Inclusion

For any campaign data export, the file should include the export timestamp and campaign ID.

**Validates: Requirements 10.3**

### Property 51: Daily Breakdown Export

For any campaign analytics export, the file should include daily breakdown data (views, orders, revenue by date).

**Validates: Requirements 10.4**

### Property 52: Campaign Milestone Notification

For any campaign that reaches 80% of its duration, a notification should be sent to the campaign creator indicating the campaign is ending soon.

**Validates: Requirements 11.1**

### Property 53: Campaign End Notification

For any campaign that transitions to "Ended" status, a notification should be sent to the campaign creator with a final analytics summary.

**Validates: Requirements 11.2**

### Property 54: Zero View Alert

For any campaign that has been active for 24 hours with zero views, an alert should be sent to the campaign creator.

**Validates: Requirements 11.3**

### Property 55: Vendor Limit Violation Alert

For any vendor that exceeds the max_products_per_vendor limit, an alert should be sent to the admin user.

**Validates: Requirements 11.4**

### Property 56: Date Range Filtering

For any date range filter applied to the campaign list, only campaigns with start_date within the specified range should be displayed.

**Validates: Requirements 12.2**

### Property 57: Campaign Search

For any search query by campaign name or slug, the results should include all campaigns whose name or slug contains the search term (case-insensitive).

**Validates: Requirements 12.3**

### Property 58: Campaign Sorting

For any sort operation on campaigns by performance metric (views, orders, revenue, conversion rate), the results should be ordered correctly in ascending or descending order.

**Validates: Requirements 12.4**

### Property 59: Multi-Filter AND Logic

For any combination of multiple filters applied to the campaign list, only campaigns matching all filter criteria should be displayed.

**Validates: Requirements 12.5**

### Property 60: Discount Calculation Formula

For any product with a base price and campaign discount percentage, the discounted price should equal base_price × (1 - discount_percentage / 100).

**Validates: Requirements 13.1**

### Property 61: Price Display

For any campaign product in a customer's cart, both the original and discounted prices should be displayed.

**Validates: Requirements 13.2**

### Property 62: Discount Application and Recording

For any order containing campaign products, the discount should be applied at the order level and the discount amount should be recorded.

**Validates: Requirements 13.3**

### Property 63: Highest Discount Selection

For any product eligible for multiple overlapping campaigns, only the highest discount percentage should be applied.

**Validates: Requirements 13.4**

### Property 64: Ended Campaign Discount Cessation

For any campaign that has transitioned to "Ended" status, new orders should not receive the campaign discount.

**Validates: Requirements 13.5**

### Property 65: Creation Audit Logging

For any campaign creation, an audit log entry should be created with the admin user ID, timestamp, and campaign details.

**Validates: Requirements 14.1**

### Property 66: Modification Audit Logging

For any campaign modification, an audit log entry should be created with the admin user ID, timestamp, field name, old value, and new value.

**Validates: Requirements 14.2**

### Property 67: Status Change Audit Logging

For any campaign status change (publish, end, archive), an audit log entry should be created with the admin user ID and timestamp.

**Validates: Requirements 14.3**

### Property 68: Audit Log Chronological Order

For any campaign audit log display, all logged events should be displayed in chronological order (oldest to newest).

**Validates: Requirements 14.4**

### Property 69: Audit Log Export

For any campaign audit log export to CSV, the file should be parseable and contain all audit trail entries with full details.

**Validates: Requirements 14.5**

### Property 70: Performance Threshold Configuration

For any campaign configuration, optional performance thresholds (minimum views, minimum orders, minimum revenue) should be storable and retrievable.

**Validates: Requirements 15.1**

### Property 71: Performance Threshold Alert

For any campaign that fails to meet a configured performance threshold after 50% of campaign duration has elapsed, an alert should be sent to the campaign creator.

**Validates: Requirements 15.2**

### Property 72: Performance Exceeded Notification

For any campaign that exceeds configured performance thresholds, a positive notification should be sent to the campaign creator.

**Validates: Requirements 15.3**

### Property 73: Performance Threshold Status Display

For any campaign with configured performance thresholds, the analytics dashboard should display the threshold status (on-track, at-risk, exceeded) with visual indicators.

**Validates: Requirements 15.4**

## Testing Strategy

### Unit Testing

**Campaign Service Tests**
- Campaign creation with valid data
- Campaign creation with invalid data (missing fields, invalid dates)
- Campaign publication with validation
- Campaign status transitions
- Campaign archival
- Duplicate slug detection
- Business rule validation

**Analytics Service Tests**
- View event recording
- Order recording and attribution
- View count aggregation
- Unique visitor counting
- Revenue calculation
- Conversion rate calculation
- Top products ranking

**Discount Calculator Tests**
- Discount calculation formula accuracy
- Multiple campaign overlap handling
- Highest discount selection
- Price floor enforcement
- Discount application at checkout

**Product Manager Tests**
- Product addition with category validation
- Vendor limit enforcement
- Product removal and logging
- Eligible product retrieval

**Audit Logger Tests**
- Creation event logging
- Modification event logging
- Status change logging
- Audit log retrieval in chronological order

### Integration Testing

**Campaign Lifecycle**
- Create → Publish → Active → End → Archive flow
- Scheduled campaign auto-activation
- Expired campaign auto-ending
- Status transition notifications

**Product Management**
- Add products with category validation
- Enforce vendor limits
- Remove products and verify logging
- Update product counts

**Analytics Integration**
- Record views and verify aggregation
- Record orders and verify attribution
- Calculate metrics from recorded data
- Export analytics and verify format

**Discount Application**
- Apply discounts at checkout
- Handle multiple overlapping campaigns
- Verify discount recording
- Verify price calculations

**Audit Trail**
- Verify all changes are logged
- Verify audit log completeness
- Verify chronological ordering
- Verify export functionality

### Property-Based Testing

**Property 1: Discount Calculation**
- For any base_price and discount_percentage, discounted_price should equal base_price × (1 - discount_percentage / 100)
- Test with random prices (0.01 to 100000) and discounts (5 to 100)
- Minimum 100 iterations
- Feature: campaign-manager, Property 60: Discount Calculation Formula

**Property 2: View Count Aggregation**
- For any set of view events, total view count should equal the count of all events
- Test with random view counts (0 to 10000)
- Minimum 100 iterations
- Feature: campaign-manager, Property 22: View Count Aggregation

**Property 3: Revenue Aggregation**
- For any set of orders, total revenue should equal the sum of all order revenues
- Test with random order amounts (0.01 to 10000)
- Minimum 100 iterations
- Feature: campaign-manager, Property 28: Revenue Calculation

**Property 4: Conversion Rate Calculation**
- For any campaign with views and orders, conversion_rate should equal (orders / views) × 100
- Test with random view/order combinations
- Minimum 100 iterations
- Feature: campaign-manager, Property 30: Conversion Rate Calculation

**Property 5: Date Range Validation**
- For any end_date not after start_date, campaign creation should be rejected
- Test with random date combinations
- Minimum 100 iterations
- Feature: campaign-manager, Property 4: Date Range Validation

**Property 6: Vendor Limit Enforcement**
- For any vendor with products at the limit, adding another product should be rejected
- Test with random vendor/product combinations
- Minimum 100 iterations
- Feature: campaign-manager, Property 12: Vendor Product Limit Enforcement

**Property 7: Slug Uniqueness**
- For any existing slug, creating a campaign with the same slug should be rejected
- Test with random slug values
- Minimum 100 iterations
- Feature: campaign-manager, Property 2: Duplicate Slug Rejection

**Property 8: Discount Percentage Range**
- For any discount outside [5, 100], campaign configuration should be rejected
- Test with random discount values (0 to 200)
- Minimum 100 iterations
- Feature: campaign-manager, Property 6: Discount Percentage Range

**Property 9: Campaign Duration Validation**
- For any duration outside [1 day, 365 days], campaign creation should be rejected
- Test with random duration values
- Minimum 100 iterations
- Feature: campaign-manager, Property 39: Campaign Duration Validation

**Property 10: Highest Discount Selection**
- For any product with multiple overlapping campaigns, the highest discount should be applied
- Test with random campaign/discount combinations
- Minimum 100 iterations
- Feature: campaign-manager, Property 63: Highest Discount Selection

### End-to-End Testing

**Complete Campaign Flow**
1. Admin creates campaign with all details
2. Admin adds products to campaign
3. Campaign auto-activates at start date
4. Customer views campaign landing page
5. Customer adds product to cart
6. Customer completes checkout with discount
7. Admin views analytics dashboard
8. Admin exports analytics
9. Campaign auto-ends at end date
10. Admin archives campaign

**Analytics Accuracy**
1. Record multiple views from different sessions
2. Verify unique visitor count
3. Record multiple orders
4. Verify revenue calculation
5. Verify conversion rate
6. Verify daily breakdown

**Audit Trail Completeness**
1. Create campaign and verify audit log
2. Modify campaign and verify audit log
3. Publish campaign and verify audit log
4. Add products and verify audit log
5. End campaign and verify audit log
6. Export audit log and verify format

**Performance Testing**
- Campaign listing with 10,000 campaigns
- Analytics calculation with 100,000 views
- Product search with 50,000 products
- Concurrent view recording (1000 concurrent users)

### Test Configuration

**Unit Tests**
- Framework: Jest (Node.js) or equivalent
- Coverage Target: 90%+
- Run: `npm run test:unit`

**Integration Tests**
- Framework: Jest with test database
- Database: PostgreSQL test instance
- Run: `npm run test:integration`

**Property-Based Tests**
- Framework: fast-check (JavaScript) or equivalent
- Iterations: Minimum 100 per property
- Run: `npm run test:properties`

**E2E Tests**
- Framework: Cypress or Playwright
- Environment: Staging
- Run: `npm run test:e2e`

