# Product Moderation Flow

## Vendor Product Lifecycle

```
Vendor creates product
      │
      ▼
approvalStatus = "pending"   ← Hidden from public
isActive = true
      │
      ▼
Admin reviews
      ├── Approve → approvalStatus = "approved"  ← Visible publicly
      └── Reject  → approvalStatus = "rejected"  ← Vendor sees rejectionReason

Vendor edits approved product (critical field: title/price/categoryId/images)
      │
      ▼
approvalStatus auto-resets to "pending"  ← Hidden until re-approved

Vendor can resubmit rejected product:
  POST /api/vendor/products/:id/submit → approvalStatus = "pending"

Admin can force-disable any product (policy violation):
  PATCH /api/admin/products/:id/disable → isActive = false
```

## Public Listing Rule

Products appear on homepage/search **only if**:
- `approvalStatus === "approved"` (or field absent for admin-created legacy products)
- `isActive !== false`

## Data Fields Added to Products

| Field | Type | Description |
|---|---|---|
| `approvalStatus` | `"pending" \| "approved" \| "rejected"` | Moderation state |
| `isActive` | `boolean` | Admin force-disable flag |
| `approvedBy` | `string \| null` | Admin UID who approved |
| `approvedAt` | `Date \| null` | Approval timestamp |
| `rejectionReason` | `string \| null` | Reason shown to vendor |
| `lastSubmittedAt` | `Date` | When vendor last submitted/resubmitted |
| `lastModeratedAt` | `Date \| null` | When admin last acted |

## Endpoint Reference

### Vendor (`/api/vendor/products`) — approved vendors only

| Method | Path | Description |
|---|---|---|
| `POST` | `/` | Create product (auto-pending) |
| `GET` | `/?status=pending|approved|rejected&page=&limit=` | List own products with filter |
| `GET` | `/:id` | Get own product |
| `PATCH` | `/:id` | Update (critical edits reset to pending) |
| `POST` | `/:id/submit` | Resubmit rejected product for approval |
| `PATCH` | `/:id/archive` | Soft-delete (isActive=false) |
| `DELETE` | `/:id` | Hard delete |

### Admin (`/api/admin/products`) — admin only

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | All products (filter by approvalStatus, vendorId, search) |
| `GET` | `/pending` | Shortcut for pending products |
| `GET` | `/by-vendor/:vendorId?status=&page=&limit=` | All products for a specific vendor |
| `PATCH` | `/:id/approve` | Approve product |
| `PATCH` | `/:id/reject` | Reject with `{ reason }` |
| `PATCH` | `/:id/disable` | Force-hide (policy violation) |
