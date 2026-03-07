# Vendor Activity Dashboard

## Overview
The Vendor Activity Dashboard is a professional real-time monitoring center for tracking vendor performance, activities, and marketplace metrics. It provides admin with comprehensive insights into vendor operations similar to platforms like Daraz and Amazon Seller Central.

## Features

### 1. Real-Time Metrics Dashboard
- **Total Revenue**: Marketplace-wide revenue with growth indicators
- **Total Orders**: Order count with percentage growth
- **Active Vendors**: Number of approved vendors with growth tracking
- **Average Order Value**: Revenue per order calculation

### 2. Top Performing Vendors
- Ranked list of top 5 vendors by revenue
- Quick stats: Total orders, recent orders, revenue, avg order value
- Direct links to vendor detail pages
- Visual ranking badges

### 3. All Vendors Performance Table
- Comprehensive vendor list with key metrics
- Columns:
  - Vendor name and email
  - Status (approved/pending/suspended)
  - Order counts (total and recent)
  - Revenue and average order value
  - Last activity timestamp
  - Quick action links
- Sortable and filterable
- Export functionality

### 4. Live Activity Feed
- Real-time activity stream
- Activity types:
  - New orders
  - Product additions
  - Payout transactions
  - Status changes
- Auto-refresh every 30 seconds
- Visual activity indicators
- Timestamp with "time ago" format

### 5. Quick Stats Panel
- Pending vendor approvals count
- Active vendors count
- Suspended vendors count
- Quick navigation to vendor management

### 6. Timeframe Filtering
- Last 7 days
- Last 30 days
- Last 90 days
- Affects all metrics and calculations

## Navigation

Access the dashboard via:
```
Admin Panel → Vendor Management → Vendor Activity
```

Or directly:
```
/admin/vendor-activity
```

## Technical Details

### API Endpoints Used
- `GET /vendors` - Fetch all vendors
- `GET /vendors/orders?vendorId={id}` - Fetch vendor orders
- `GET /orders` - Fetch recent marketplace orders

### Data Refresh
- Metrics: On page load and manual refresh
- Activity feed: Auto-refresh every 30 seconds
- Manual refresh button available

### Calculations
- **Revenue**: Sum of all order totals per vendor
- **Recent Orders**: Orders within selected timeframe
- **Avg Order Value**: Total revenue / total orders
- **Growth**: Calculated from historical data (placeholder values currently)

## UI Components

### Color Scheme
- Blue gradient: Revenue metrics
- Green gradient: Order metrics
- Purple gradient: Vendor metrics
- Orange gradient: Average order value
- Status badges: Green (approved), Yellow (pending), Red (suspended)

### Responsive Design
- Desktop: 3-column layout (2 left, 1 right)
- Tablet: Stacked layout
- Mobile: Single column with horizontal scroll for tables

## Integration with Existing Features

### Links to Other Pages
- **Vendor Detail**: Click vendor name or "View" button
- **All Vendors**: "View All" links in sections
- **Vendor Chats**: Via main navigation

### Status Management
- Displays current vendor status
- Links to vendor detail for status changes
- Visual indicators for quick identification

## Future Enhancements

### Planned Features
1. **Charts & Graphs**
   - Revenue trends over time
   - Order volume charts
   - Vendor growth charts
   - Category performance

2. **Advanced Filtering**
   - Filter by vendor status
   - Filter by revenue range
   - Filter by order count
   - Search by vendor name

3. **Real-Time Updates**
   - WebSocket integration for live updates
   - Push notifications for important events
   - Real-time order tracking

4. **Export & Reports**
   - CSV export of vendor data
   - PDF reports generation
   - Scheduled email reports
   - Custom date range reports

5. **Activity Types**
   - Product approvals/rejections
   - Payout processing
   - Vendor registration
   - Support ticket creation
   - Review submissions

6. **Performance Insights**
   - Vendor comparison tools
   - Benchmark metrics
   - Performance alerts
   - Recommendation engine

## Usage Tips

### For Daily Monitoring
1. Check the key metrics cards for overall health
2. Review top performers for success patterns
3. Monitor activity feed for real-time issues
4. Check quick stats for pending actions

### For Weekly Reviews
1. Switch to 7-day timeframe
2. Export vendor performance data
3. Review growth percentages
4. Identify underperforming vendors

### For Monthly Analysis
1. Use 30-day timeframe
2. Compare top performers
3. Analyze revenue trends
4. Plan vendor support initiatives

## Best Practices

1. **Regular Monitoring**: Check dashboard daily for marketplace health
2. **Quick Actions**: Use direct links for fast vendor management
3. **Timeframe Selection**: Choose appropriate timeframe for analysis
4. **Activity Feed**: Monitor for unusual patterns or issues
5. **Export Data**: Regular exports for record keeping

## Troubleshooting

### No Data Showing
- Verify vendors exist in database
- Check API endpoints are accessible
- Ensure proper authentication

### Slow Loading
- Large number of vendors may slow initial load
- Consider pagination for vendor list
- Optimize API queries

### Activity Feed Empty
- Check if orders exist in system
- Verify activity fetch interval
- Check console for API errors

## Related Documentation
- [Admin Panel Reorganization](./ADMIN_PANEL_REORGANIZATION.md)
- [Vendor Controls Enhanced](./VENDOR_CONTROLS_ENHANCED.md)
