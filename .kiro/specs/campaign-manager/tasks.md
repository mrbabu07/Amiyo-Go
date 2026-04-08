# Implementation Plan: Campaign Manager

## Overview

The Campaign Manager implementation follows a layered architecture with database migrations, backend services, API endpoints, frontend components, and comprehensive testing. The implementation uses MERN stack (TypeScript/Node.js backend, React frontend) with PostgreSQL for persistence and Redis for caching.

## Tasks

- [x] 1. Database Layer - Create migrations for all campaign tables
  - [x] 1.1 Create campaigns table migration
    - Create PostgreSQL migration for campaigns table with all constraints and indexes
    - _Requirements: 1.2, 2.1, 3.1, 8.1_
  
  - [x] 1.2 Create campaign_products table migration
    - Create PostgreSQL migration for campaign_products table with foreign keys and unique constraints
    - _Requirements: 9.1, 9.2_
  
  - [x] 1.3 Create campaign_views table migration
    - Create PostgreSQL migration for campaign_views table with indexes for analytics queries
    - _Requirements: 5.1, 5.2_
  
  - [x] 1.4 Create campaign_orders table migration
    - Create PostgreSQL migration for campaign_orders table with order attribution tracking
    - _Requirements: 6.1, 6.2_
  
  - [x] 1.5 Create campaign_analytics table migration
    - Create PostgreSQL migration for campaign_analytics aggregation table with daily metrics
    - _Requirements: 5.2, 5.3, 6.2, 6.3_
  
  - [x] 1.6 Create campaign_audit_logs table migration
    - Create PostgreSQL migration for campaign_audit_logs table for compliance tracking
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [x] 1.7 Create campaign_notifications table migration
    - Create PostgreSQL migration for campaign_notifications table for alert management
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Backend Services - Core Campaign Service
  - [x] 2.1 Implement CampaignService class with CRUD operations
    - Create TypeScript service class with createCampaign, getCampaign, updateCampaign, deleteCampaign methods
    - Implement campaign validation logic for all business rules
    - _Requirements: 1.2, 1.3, 1.5, 1.6_
  
  - [ ]* 2.2 Write property test for campaign creation
    - **Property 1: Campaign Creation Stores Draft Status**
    - **Validates: Requirements 1.2**
  
  - [x] 2.3 Implement campaign publication and status transitions
    - Implement publishCampaign, endCampaign, archiveCampaign methods
    - Add validation for status transition rules
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 2.4 Write property test for campaign status transitions
    - **Property 33: Campaign Publication Validation**
    - **Validates: Requirements 7.1, 7.2**
  
  - [x] 2.5 Implement campaign listing and filtering
    - Implement listCampaigns with filters (status, dateRange, search)
    - Add sorting by performance metrics
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ]* 2.6 Write property test for campaign filtering
    - **Property 56: Date Range Filtering**
    - **Validates: Requirements 12.2**

- [ ] 3. Backend Services - Analytics Service
  - [x] 3.1 Implement CampaignAnalyticsService for view tracking
    - Create recordView method to log campaign views with session tracking
    - Implement getAnalytics method to retrieve aggregated metrics
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 3.2 Write property test for view count aggregation
    - **Property 22: View Count Aggregation**
    - **Validates: Requirements 5.2**
  
  - [x] 3.3 Implement order tracking and revenue calculation
    - Create recordOrder method to log campaign orders with revenue
    - Implement getOrderMetrics method for order analytics
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 3.4 Write property test for revenue aggregation
    - **Property 28: Revenue Calculation**
    - **Validates: Requirements 6.3**
  
  - [x] 3.5 Implement top products and conversion rate calculations
    - Implement getTopProducts method with view/revenue ranking
    - Implement getConversionRate method for conversion metrics
    - _Requirements: 5.5, 6.7, 6.5_
  
  - [ ]* 3.6 Write property test for conversion rate calculation
    - **Property 30: Conversion Rate Calculation**
    - **Validates: Requirements 6.5**
  
  - [x] 3.7 Implement analytics export functionality
    - Create exportAnalytics method to generate CSV with daily breakdown
    - Include export metadata (timestamp, campaign ID)
    - _Requirements: 10.1, 10.3, 10.4_
  
  - [ ]* 3.8 Write property test for analytics export round trip
    - **Property 48: Analytics Export Round Trip**
    - **Validates: Requirements 10.1**

- [ ] 4. Backend Services - Discount Calculator Service
  - [x] 4.1 Implement DiscountCalculatorService with discount logic
    - Create calculateDiscountedPrice method with formula validation
    - Implement getApplicableCampaigns to find eligible campaigns for a product
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ]* 4.2 Write property test for discount calculation formula
    - **Property 60: Discount Calculation Formula**
    - **Validates: Requirements 13.1**
  
  - [x] 4.3 Implement highest discount selection for overlapping campaigns
    - Create getHighestDiscount method to select best discount when multiple campaigns apply
    - Implement applyDiscount method for order-level discount application
    - _Requirements: 13.4, 13.5_
  
  - [ ]* 4.4 Write property test for highest discount selection
    - **Property 63: Highest Discount Selection**
    - **Validates: Requirements 13.4**

- [ ] 5. Backend Services - Product Manager Service
  - [x] 5.1 Implement ProductManagerService for campaign product management
    - Create addProductsToCampaign method with category and vendor validation
    - Implement removeProductFromCampaign with audit logging
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 5.2 Write property test for product addition validation
    - **Property 46: Product Addition Validation**
    - **Validates: Requirements 9.2, 9.4**
  
  - [x] 5.3 Implement vendor limit enforcement
    - Create checkVendorLimit method to enforce max_products_per_vendor constraint
    - Implement getEligibleProducts to retrieve campaign products
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 5.4 Write property test for vendor limit enforcement
    - **Property 12: Vendor Product Limit Enforcement**
    - **Validates: Requirements 3.2**
  
  - [x] 5.5 Implement product export functionality
    - Create exportProducts method to generate CSV with pricing and vendor info
    - _Requirements: 10.2, 10.3_
  
  - [ ]* 5.6 Write property test for product export round trip
    - **Property 49: Product Export Round Trip**
    - **Validates: Requirements 10.2, 10.3**

- [ ] 6. Backend Services - Audit Logger Service
  - [ ] 6.1 Implement AuditLoggerService for compliance tracking
    - Create logCampaignCreation method to record creation events
    - Implement logCampaignModification for field-level change tracking
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [ ] 6.2 Implement audit log retrieval and export
    - Create getAuditLogs method with chronological ordering
    - Implement exportAuditLogs for CSV export
    - _Requirements: 14.4, 14.5_
  
  - [ ]* 6.3 Write property test for audit log chronological order
    - **Property 68: Audit Log Chronological Order**
    - **Validates: Requirements 14.4**

- [ ] 7. Backend Services - Scheduler Service
  - [ ] 7.1 Implement CampaignSchedulerService for automated transitions
    - Create processScheduledCampaigns method to activate campaigns at start_date
    - Implement processExpiredCampaigns to end campaigns at end_date
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [ ] 7.2 Implement analytics aggregation job
    - Create aggregateAnalytics method to consolidate Redis metrics to database
    - Implement daily metrics calculation
    - _Requirements: 5.2, 5.3, 6.2, 6.3_
  
  - [ ] 7.3 Implement performance threshold checking
    - Create checkPerformanceThresholds method to evaluate campaign performance
    - Implement threshold alert generation
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [ ] 7.4 Implement notification sending job
    - Create sendNotifications method to dispatch pending notifications
    - Implement retry logic for failed notifications
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 8. Backend Services - Validation and Business Rules
  - [ ] 8.1 Implement campaign validation rules
    - Create validators for date ranges, discount percentages, slug uniqueness
    - Implement category eligibility and vendor constraint validation
    - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.3, 3.1, 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 8.2 Write property tests for validation rules
    - **Property 2: Duplicate Slug Rejection**
    - **Property 4: Date Range Validation**
    - **Property 6: Discount Percentage Range**
    - **Property 39: Campaign Duration Validation**
    - **Validates: Requirements 1.3, 1.5, 2.1, 8.1**

- [ ] 9. API Endpoints - Campaign Management
  - [x] 9.1 Implement POST /api/campaigns endpoint
    - Create campaign creation endpoint with validation and image upload
    - Integrate with S3 for banner image storage
    - _Requirements: 1.2, 1.4, 1.6_
  
  - [x] 9.2 Implement GET /api/campaigns/:id endpoint
    - Create campaign retrieval endpoint with public/admin access control
    - _Requirements: 1.2_
  
  - [x] 9.3 Implement PUT /api/campaigns/:id endpoint
    - Create campaign update endpoint with Draft-only restriction
    - Implement audit logging for modifications
    - _Requirements: 2.5, 2.6, 14.2_
  
  - [x] 9.4 Implement GET /api/campaigns endpoint
    - Create campaign listing endpoint with filtering and pagination
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 9.5 Implement POST /api/campaigns/:id/publish endpoint
    - Create campaign publication endpoint with status transition
    - _Requirements: 7.1, 7.2_
  
  - [x] 9.6 Implement POST /api/campaigns/:id/end endpoint
    - Create manual campaign ending endpoint
    - _Requirements: 7.6_
  
  - [x] 9.7 Implement POST /api/campaigns/:id/archive endpoint
    - Create campaign archival endpoint
    - _Requirements: 7.4_

- [ ] 10. API Endpoints - Campaign Products
  - [x] 10.1 Implement POST /api/campaigns/:id/products endpoint
    - Create product addition endpoint with category and vendor validation
    - _Requirements: 9.2, 9.4_
  
  - [x] 10.2 Implement DELETE /api/campaigns/:id/products/:productId endpoint
    - Create product removal endpoint with audit logging
    - _Requirements: 9.3_
  
  - [x] 10.3 Implement GET /api/campaigns/:id/products endpoint
    - Create product listing endpoint with pagination
    - _Requirements: 9.1, 9.5_

- [ ] 11. API Endpoints - Campaign Analytics
  - [x] 11.1 Implement GET /api/campaigns/:id/analytics endpoint
    - Create analytics summary endpoint with date range filtering
    - _Requirements: 5.2, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 11.2 Implement GET /api/campaigns/:id/analytics/views endpoint
    - Create view metrics endpoint with daily breakdown
    - _Requirements: 5.2, 5.3, 5.4_
  
  - [x] 11.3 Implement GET /api/campaigns/:id/analytics/orders endpoint
    - Create order metrics endpoint
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  
  - [x] 11.4 Implement GET /api/campaigns/:id/analytics/top-products endpoint
    - Create top products endpoint with view/revenue ranking
    - _Requirements: 5.5, 6.7_
  
  - [x] 11.5 Implement GET /api/campaigns/:id/analytics/export endpoint
    - Create analytics export endpoint with CSV generation
    - _Requirements: 10.1, 10.3, 10.4_

- [ ] 12. API Endpoints - Campaign Landing Page
  - [x] 12.1 Implement GET /api/campaigns/slug/:slug endpoint
    - Create public campaign retrieval endpoint with product listing
    - _Requirements: 4.1, 4.6_
  
  - [x] 12.2 Implement POST /api/campaigns/:id/view endpoint
    - Create view recording endpoint with session tracking
    - _Requirements: 4.5, 5.1_

- [ ] 13. API Endpoints - Campaign Audit
  - [x] 13.1 Implement GET /api/campaigns/:id/audit-logs endpoint
    - Create audit log retrieval endpoint with filtering
    - _Requirements: 14.4_
  
  - [x] 13.2 Implement GET /api/campaigns/:id/audit-logs/export endpoint
    - Create audit log export endpoint with CSV generation
    - _Requirements: 14.5_

- [x] 14. Checkpoint - Backend API Implementation Complete
  - Ensure all backend services are implemented and tested
  - Verify all API endpoints are functional
  - Ensure all tests pass, ask the user if questions arise.

- [-] 15. Frontend Components - Campaign Form
  - [x] 15.1 Create CampaignForm component for campaign creation/editing
    - Implement form with fields for name, slug, dates, discount, categories
    - Add image upload with preview and validation
    - _Requirements: 1.2, 1.4, 2.1, 2.2_
  
  - [ ] 15.2 Implement form validation and error handling
    - Add client-side validation for all fields
    - Display validation errors to user
    - _Requirements: 1.3, 1.5, 2.1, 2.3_
  
  - [ ] 15.3 Implement date range picker component
    - Create date picker with start/end date selection
    - Validate date ranges on change
    - _Requirements: 1.5, 8.1_
  
  - [ ] 15.4 Implement category multi-select component
    - Create category selector with multiple selection
    - Display selected categories
    - _Requirements: 2.2, 8.2_

- [ ] 16. Frontend Components - Campaign Landing Page
  - [x] 16.1 Create CampaignLandingPage component
    - Display campaign details, banner image, and description
    - Implement product grid with discounted prices
    - _Requirements: 4.1, 4.4, 4.7_
  
  - [x] 16.2 Implement CountdownTimer component
    - Create real-time countdown display (days, hours, minutes, seconds)
    - Auto-update every second
    - _Requirements: 4.2, 4.3_
  
  - [ ]* 16.3 Write property test for countdown timer display
    - **Property 15: Countdown Timer Display**
    - **Validates: Requirements 4.2**
  
  - [ ] 16.4 Implement product grid with add-to-cart functionality
    - Display eligible products with base and discounted prices
    - Integrate with cart system
    - _Requirements: 4.4, 4.7_
  
  - [ ] 16.5 Implement view tracking on page load
    - Record campaign view when page loads
    - Track session ID and user ID if logged in
    - _Requirements: 4.5, 5.1_

- [ ] 17. Frontend Components - Campaign Management Dashboard
  - [x] 17.1 Create CampaignManagementList component
    - Display list of campaigns with status, dates, and performance metrics
    - Implement filtering by status and date range
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [ ] 17.2 Implement campaign search functionality
    - Add search input for campaign name/slug
    - Display search results in real-time
    - _Requirements: 12.3_
  
  - [ ] 17.3 Implement campaign sorting
    - Add sort options for views, orders, revenue, conversion rate
    - _Requirements: 12.4_
  
  - [ ] 17.4 Implement bulk campaign actions
    - Add publish, end, archive buttons for campaigns
    - _Requirements: 7.1, 7.3, 7.4, 7.6_

- [ ] 18. Frontend Components - Campaign Analytics Dashboard
  - [x] 18.1 Create CampaignAnalyticsDashboard component
    - Display real-time metrics (views, orders, revenue, conversion rate)
    - Show performance threshold status with visual indicators
    - _Requirements: 5.2, 6.2, 6.3, 6.4, 6.5, 15.4_
  
  - [ ] 18.2 Implement view/order/revenue trend charts
    - Create line charts for daily metrics breakdown
    - _Requirements: 5.3, 6.6_
  
  - [ ] 18.3 Implement top products display
    - Show top 10 products by views and revenue
    - _Requirements: 5.5, 6.7_
  
  - [ ] 18.4 Implement analytics export functionality
    - Add export button for CSV download
    - _Requirements: 10.1, 10.3, 10.4_

- [ ] 19. Frontend Components - Product Management
  - [ ] 19.1 Create ProductSelector component for adding products
    - Display available products with category filtering
    - Show vendor and product count
    - _Requirements: 9.1, 9.2_
  
  - [ ] 19.2 Implement product removal functionality
    - Add remove button for each product
    - Confirm removal before deleting
    - _Requirements: 9.3_
  
  - [ ] 19.3 Implement vendor limit display
    - Show current product count per vendor
    - Display max limit and remaining slots
    - _Requirements: 3.1, 3.2_

- [ ] 20. Frontend Components - Audit Log Viewer
  - [ ] 20.1 Create AuditLogViewer component
    - Display audit log entries in chronological order
    - Show action, admin user, timestamp, and changes
    - _Requirements: 14.4_
  
  - [ ] 20.2 Implement audit log filtering
    - Add filter by action type
    - _Requirements: 14.4_
  
  - [ ] 20.3 Implement audit log export
    - Add export button for CSV download
    - _Requirements: 14.5_

- [ ] 21. Checkpoint - Frontend Components Complete
  - Ensure all React components are implemented and functional
  - Verify form validation and error handling
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Integration - Wire Campaign Services with API Endpoints
  - [ ] 22.1 Integrate CampaignService with campaign endpoints
    - Connect service methods to API route handlers
    - Implement error handling and response formatting
    - _Requirements: 1.2, 2.5, 7.1, 7.3, 7.4, 7.6_
  
  - [ ] 22.2 Integrate AnalyticsService with analytics endpoints
    - Connect analytics methods to API routes
    - Implement caching for performance
    - _Requirements: 5.2, 6.2, 6.3_
  
  - [ ] 22.3 Integrate ProductManagerService with product endpoints
    - Connect product management methods to API routes
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ] 22.4 Integrate DiscountCalculatorService with checkout
    - Connect discount calculation to order processing
    - _Requirements: 13.1, 13.3, 13.4_

- [ ] 23. Integration - Wire Frontend Components with API
  - [ ] 23.1 Connect CampaignForm to campaign creation API
    - Implement form submission and API calls
    - Handle image upload to S3
    - _Requirements: 1.2, 1.4_
  
  - [ ] 23.2 Connect CampaignLandingPage to campaign and analytics APIs
    - Fetch campaign details and products
    - Record view events
    - _Requirements: 4.1, 4.4, 4.5, 5.1_
  
  - [ ] 23.3 Connect CampaignManagementList to campaign listing API
    - Fetch campaigns with filters and sorting
    - Implement pagination
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [ ] 23.4 Connect CampaignAnalyticsDashboard to analytics API
    - Fetch analytics data and display metrics
    - Implement real-time updates
    - _Requirements: 5.2, 6.2, 6.3, 6.4, 6.5_

- [-] 24. Background Jobs - Scheduler Implementation
  - [x] 24.1 Implement scheduled job runner
    - Set up job scheduler (e.g., node-cron or Bull queue)
    - Create job execution framework
    - _Requirements: 7.2, 7.3_
  
  - [x] 24.2 Implement processScheduledCampaigns job
    - Run every minute to check for campaigns to activate
    - Transition Scheduled → Active campaigns
    - _Requirements: 7.2_
  
  - [x] 24.3 Implement processExpiredCampaigns job
    - Run every minute to check for campaigns to end
    - Transition Active → Ended campaigns
    - _Requirements: 7.3_
  
  - [x] 24.4 Implement aggregateAnalytics job
    - Run every 5 minutes to aggregate Redis metrics
    - Calculate daily metrics and update database
    - _Requirements: 5.2, 5.3, 6.2, 6.3_
  
  - [x] 24.5 Implement checkPerformanceThresholds job
    - Run every 30 minutes to evaluate campaign performance
    - Generate alerts for at-risk campaigns
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [x] 24.6 Implement sendNotifications job
    - Run every 10 minutes to send pending notifications
    - Implement retry logic for failures
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 25. Caching Layer - Redis Integration
  - [x] 25.1 Implement Redis cache for campaigns
    - Cache campaign objects with 5-minute TTL
    - Implement cache invalidation on updates
    - _Requirements: 5.2, 6.2_
  
  - [x] 25.2 Implement Redis counters for view tracking
    - Use Redis counters for real-time view counts
    - Aggregate to database every 5 minutes
    - _Requirements: 5.2, 5.3_
  
  - [x] 25.3 Implement Redis cache for active/scheduled campaigns
    - Cache lists of active and scheduled campaigns
    - Invalidate on status transitions
    - _Requirements: 7.2, 7.3_

- [ ] 26. Testing - Unit Tests for Services
  - [ ] 26.1 Write unit tests for CampaignService
    - Test campaign creation, update, deletion
    - Test status transitions and validation
    - _Requirements: 1.2, 2.5, 7.1, 7.3_
  
  - [ ] 26.2 Write unit tests for AnalyticsService
    - Test view recording and aggregation
    - Test order recording and metrics calculation
    - _Requirements: 5.1, 5.2, 6.1, 6.2_
  
  - [ ] 26.3 Write unit tests for DiscountCalculatorService
    - Test discount calculation formula
    - Test highest discount selection
    - _Requirements: 13.1, 13.4_
  
  - [ ] 26.4 Write unit tests for ProductManagerService
    - Test product addition with validation
    - Test vendor limit enforcement
    - _Requirements: 9.2, 3.2_
  
  - [ ] 26.5 Write unit tests for AuditLoggerService
    - Test audit log creation and retrieval
    - Test chronological ordering
    - _Requirements: 14.1, 14.4_

- [ ] 27. Testing - Integration Tests
  - [ ] 27.1 Write integration tests for campaign lifecycle
    - Test Create → Publish → Active → End → Archive flow
    - Test automatic status transitions
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 27.2 Write integration tests for product management
    - Test adding/removing products with validation
    - Test vendor limit enforcement
    - _Requirements: 9.2, 9.3, 3.2_
  
  - [ ] 27.3 Write integration tests for analytics
    - Test view recording and aggregation
    - Test order recording and metrics
    - _Requirements: 5.1, 5.2, 6.1, 6.2_
  
  - [ ] 27.4 Write integration tests for discount application
    - Test discount calculation at checkout
    - Test multiple campaign overlap handling
    - _Requirements: 13.1, 13.3, 13.4_

- [ ] 28. Testing - Property-Based Tests
  - [ ]* 28.1 Write property test for slug uniqueness
    - **Property 2: Duplicate Slug Rejection**
    - **Validates: Requirements 1.3**
  
  - [ ]* 28.2 Write property test for date range validation
    - **Property 4: Date Range Validation**
    - **Validates: Requirements 1.5**
  
  - [ ]* 28.3 Write property test for discount percentage range
    - **Property 6: Discount Percentage Range**
    - **Validates: Requirements 2.1, 2.3**
  
  - [ ]* 28.4 Write property test for vendor limit enforcement
    - **Property 12: Vendor Product Limit Enforcement**
    - **Validates: Requirements 3.2**
  
  - [ ]* 28.5 Write property test for campaign duration validation
    - **Property 39: Campaign Duration Validation**
    - **Validates: Requirements 8.1**
  
  - [ ]* 28.6 Write property test for discount calculation
    - **Property 60: Discount Calculation Formula**
    - **Validates: Requirements 13.1**
  
  - [ ]* 28.7 Write property test for view count aggregation
    - **Property 22: View Count Aggregation**
    - **Validates: Requirements 5.2**
  
  - [ ]* 28.8 Write property test for revenue aggregation
    - **Property 28: Revenue Calculation**
    - **Validates: Requirements 6.3**
  
  - [ ]* 28.9 Write property test for conversion rate calculation
    - **Property 30: Conversion Rate Calculation**
    - **Validates: Requirements 6.5**
  
  - [ ]* 28.10 Write property test for highest discount selection
    - **Property 63: Highest Discount Selection**
    - **Validates: Requirements 13.4**

- [ ] 29. Checkpoint - All Tests Pass
  - Ensure all unit, integration, and property-based tests pass
  - Verify test coverage meets 90%+ target
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 30. Documentation - API Documentation
  - [ ] 30.1 Create API documentation for campaign endpoints
    - Document all campaign management endpoints with examples
    - Include request/response schemas
    - _Requirements: 1.2, 7.1, 7.3, 7.4_
  
  - [ ] 30.2 Create API documentation for analytics endpoints
    - Document analytics endpoints with query parameters
    - Include response examples
    - _Requirements: 5.2, 6.2, 6.3_
  
  - [ ] 30.3 Create API documentation for product endpoints
    - Document product management endpoints
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 31. Documentation - Deployment Guide
  - [ ] 31.1 Create deployment guide for database migrations
    - Document migration process and rollback procedures
    - _Requirements: 1.1_
  
  - [ ] 31.2 Create deployment guide for backend services
    - Document environment variables and configuration
    - Document scheduler job setup
    - _Requirements: 24.1_
  
  - [ ] 31.3 Create deployment guide for frontend
    - Document build and deployment process
    - _Requirements: 15.1_

- [ ] 32. Final Checkpoint - Campaign Manager Feature Complete
  - Ensure all components are integrated and functional
  - Verify all requirements are met
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation uses MERN stack (TypeScript/Node.js backend, React frontend)
- PostgreSQL for persistence, Redis for caching and real-time metrics
- All API endpoints follow RESTful conventions
- All frontend components use React hooks and functional components
