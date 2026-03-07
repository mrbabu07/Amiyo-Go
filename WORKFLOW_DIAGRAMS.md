# BazarBD Marketplace - Workflow Diagrams

Visual representation of current vs proposed workflows for role clarity.

---

## 1. PRODUCT LIFECYCLE WORKFLOW

### Current Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCT CREATION                          │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ VENDOR CREATES   │  │ ADMIN CREATES    │
        │ → Pending        │  │ → Approved ✅    │
        │ (needs approval) │  │ (no approval)    │
        └────────┬─────────┘  └──────────────────┘
                 │                      │
                 ▼                      │
        ┌──────────────────┐           │
        │ ADMIN REVIEWS    │           │
        │ - Quality check  │           │
        │ - Policy check   │           │
        └────────┬─────────┘           │
                 │                      │
        ┌────────┴────────┐            │
        │                 │            │
        ▼                 ▼            │
┌──────────────┐  ┌──────────────┐   │
│ APPROVED ✅  │  │ REJECTED ❌  │   │
│ (visible)    │  │ (vendor fix) │   │
└──────┬───────┘  └──────────────┘   │
       │                               │
       └───────────────┬───────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ LIVE ON PLATFORM │
              └──────────────────┘

❌ PROBLEM: Admin bypasses approval, unfair advantage
```

### Proposed Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCT CREATION                          │
│              (Same process for ALL users)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ VENDOR CREATES   │  │ ADMIN CREATES    │
        │ → Pending        │  │ → Pending        │
        └────────┬─────────┘  └────────┬─────────┘
                 │                      │
                 └──────────┬───────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ ADMIN REVIEWS    │
                   │ - Quality check  │
                   │ - Policy check   │
                   └────────┬─────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
                   ▼                 ▼
           ┌──────────────┐  ┌──────────────┐
           │ APPROVED ✅  │  │ REJECTED ❌  │
           │ (visible)    │  │ (creator fix)│
           └──────┬───────┘  └──────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ LIVE ON PLATFORM │
         └──────────────────┘

✅ SOLUTION: Fair process for everyone
```

---

## 2. ORDER MANAGEMENT WORKFLOW

### Current Flow (Confusing)
```
┌──────────────────────────────────────────────────────────┐
│                    CUSTOMER ORDER                         │
│  Order #12345 - Total: $150                              │
│  Status: "Processing" (unclear who controls)             │
└──────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Vendor A     │ │ Vendor B     │ │ Admin        │
│ Item 1: $50  │ │ Item 2: $100 │ │ Can override │
│ (confused)   │ │ (confused)   │ │ any status   │
└──────────────┘ └──────────────┘ └──────────────┘

❌ PROBLEM: Unclear who controls what
```

### Proposed Flow (Clear)
```
┌──────────────────────────────────────────────────────────────┐
│              PLATFORM ORDER (Admin Oversight)                 │
│  Order #12345 - Total: $150                                  │
│  Order Status: Derived from all items                        │
│  Admin can view full order, override only in disputes        │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ VENDOR A ITEMS   │  │ VENDOR B ITEMS   │  │ DELIVERY         │
│ Item 1: $50      │  │ Item 2: $100     │  │ (Platform)       │
│ Status: Shipped  │  │ Status: Pending  │  │                  │
│                  │  │                  │  │ Delivery charge  │
│ Vendor A updates │  │ Vendor B updates │  │ Tracking         │
│ this status      │  │ this status      │  │ Customer support │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Vendor A         │  │ Vendor B         │  │ Customer         │
│ Fulfillment      │  │ Fulfillment      │  │ Receives         │
└──────────────────┘  └──────────────────┘  └──────────────────┘

✅ SOLUTION: Clear ownership, vendor controls their items
```

---

## 3. RETURN WORKFLOW

### Current Flow (Admin-Only)
```
┌──────────────────┐
│ Customer         │
│ Requests Return  │
│ (with reason)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Admin Reviews    │
│ - No vendor input│
│ - Makes decision │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Approve │ │Reject  │
└───┬────┘ └────────┘
    │
    ▼
┌──────────────────┐
│ Refund Customer  │
│ Deduct Vendor    │
│ (no notice)      │
└──────────────────┘

❌ PROBLEM: Vendor excluded, feels unfair
```

### Proposed Flow (Vendor-First)
```
┌──────────────────┐
│ Customer         │
│ Requests Return  │
│ (with reason +   │
│  evidence)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Vendor Reviews       │
│ - Check reason       │
│ - Review evidence    │
│ - Provide response   │
└────────┬─────────────┘
         │
    ┌────┴────────────────┐
    │                     │
    ▼                     ▼
┌─────────────────┐  ┌──────────────────┐
│ Vendor Approves │  │ Vendor Disputes  │
│ "Item damaged"  │  │ "Customer misuse"│
│ "Wrong item"    │  │ "No evidence"    │
└────────┬────────┘  └────────┬─────────┘
         │                     │
         │                     ▼
         │            ┌──────────────────┐
         │            │ Admin Arbitrates │
         │            │ - Review both    │
         │            │   sides          │
         │            │ - Make fair      │
         │            │   decision       │
         │            └────────┬─────────┘
         │                     │
         │                ┌────┴────┐
         │                │         │
         ▼                ▼         ▼
┌─────────────────┐  ┌────────┐ ┌────────┐
│ Auto-Refund     │  │Approve │ │Reject  │
│ (vendor agreed) │  │Return  │ │Return  │
└────────┬────────┘  └───┬────┘ └────────┘
         │                │
         └────────┬───────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Refund Customer  │
         │ Deduct Vendor    │
         │ (with notice +   │
         │  explanation)    │
         └──────────────────┘

✅ SOLUTION: Fair process, vendor input, faster resolution
```

---

## 4. PAYOUT WORKFLOW

### Current Flow (Opaque)
```
┌──────────────────────────────────────┐
│ Vendor Earnings                      │
│ (Vendor sees final number only)     │
│ $500 - ??? = $350                   │
│ "Why $150 deducted?"                │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ Admin Calculates                     │
│ - Delivered items                    │
│ - Minus commission (hidden)          │
│ - Minus returns (no notice)          │
│ - Minus already paid                 │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ Admin Creates Payout                 │
│ (Weekly, vendor has no control)      │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ Admin Marks as Paid                  │
│ (Vendor notified after the fact)     │
└──────────────────────────────────────┘

❌ PROBLEM: No transparency, no control, distrust
```

### Proposed Flow (Transparent)
```
┌──────────────────────────────────────────────────────┐
│ VENDOR EARNINGS DASHBOARD (Real-time)                │
│                                                      │
│ Delivered Items:              $1,000                │
│ - Platform Commission (15%):   -$150               │
│ - Return Deductions (2 items): -$50                │
│ - Already Paid:                -$500               │
│ - Pending Payouts:             -$0                 │
│ ═══════════════════════════════════════            │
│ = Eligible for Payout:         $300                │
│                                                      │
│ Minimum Threshold: $100 ✅                          │
│ Next Auto-Payout: Monday, Jan 15                   │
│                                                      │
│ [Request Payout Now] [View Breakdown]              │
└──────────────────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│ Auto-Payout  │  │ Manual       │
│ (Weekly)     │  │ Request      │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ Admin Reviews & Approves             │
│ - Verify bank details                │
│ - Check for issues                   │
│ - Process payment                    │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ Payment Processed                    │
│ - Vendor notified                    │
│ - Receipt generated                  │
│ - Status: Paid                       │
└──────────────────────────────────────┘

✅ SOLUTION: Full transparency, vendor control, trust
```

---

## 5. COMMISSION TRACKING

### Current Flow (Hidden)
```
┌──────────────────┐
│ Order Created    │
│ Item: $100       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Commission       │
│ Calculated       │
│ (hidden from     │
│  vendor)         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Vendor sees:     │
│ "Earnings: $85"  │
│ (no breakdown)   │
└──────────────────┘

❌ PROBLEM: Vendor doesn't understand deduction
```

### Proposed Flow (Transparent)
```
┌──────────────────────────────────────┐
│ Product Creation                     │
│ Category: Electronics                │
│ Price: $100                          │
│                                      │
│ ⚠️ Commission Rate: 15%             │
│ Your earning: $85 per sale          │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ Order Created                        │
│ Item: $100                           │
│                                      │
│ BREAKDOWN:                           │
│ Item Subtotal:        $100.00       │
│ Platform Fee (15%):   -$15.00       │
│ ─────────────────────────────       │
│ Your Earnings:        $85.00        │
│                                      │
│ Commission locked at order time     │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ Vendor Finance Dashboard             │
│                                      │
│ Order #12345                         │
│ ├─ Item Subtotal:    $100.00       │
│ ├─ Commission (15%): -$15.00       │
│ └─ Your Earnings:    $85.00        │
│                                      │
│ [View Commission Policy]            │
└──────────────────────────────────────┘

✅ SOLUTION: Full transparency, vendor understands costs
```

---

## 6. CATEGORY REQUEST WORKFLOW (New Feature)

### Proposed Flow
```
┌──────────────────┐
│ Vendor           │
│ Wants to sell    │
│ in new category  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Vendor Submits Request               │
│ - Category: "Smart Home Devices"     │
│ - Reason: "Expanding product line"   │
│ - Experience: "5 years in tech"      │
│ - Sample products: [links]           │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Admin Reviews Request                │
│ - Check vendor history               │
│ - Review sample products             │
│ - Verify category fit                │
│ - Check vendor performance           │
└────────┬─────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Approve │ │Reject  │
└───┬────┘ └───┬────┘
    │          │
    │          ▼
    │     ┌──────────────────┐
    │     │ Vendor Notified  │
    │     │ (with reason)    │
    │     └──────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│ Category Added to Vendor             │
│ Vendor can now add products          │
│ Vendor notified                      │
└──────────────────────────────────────┘

✅ BENEFIT: Vendor autonomy, admin oversight
```

---

## 7. ROLE PERMISSION MATRIX

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMISSION MATRIX                             │
├─────────────────────┬──────────┬──────────┬──────────┬──────────┤
│ Action              │ Customer │ Vendor   │ Admin    │ Notes    │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ PRODUCTS                                                         │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ View products       │    ✅    │    ✅    │    ✅    │ Public   │
│ Create product      │    ❌    │    ✅    │    ✅    │ Approval │
│ Edit own product    │    ❌    │    ✅    │    ✅    │ Re-check │
│ Delete own product  │    ❌    │    ✅    │    ✅    │ Soft del │
│ Approve product     │    ❌    │    ❌    │    ✅    │ Moderate │
│ Reject product      │    ❌    │    ❌    │    ✅    │ Moderate │
│ View all products   │    ❌    │    ❌    │    ✅    │ Oversight│
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ ORDERS                                                           │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Place order         │    ✅    │    ❌    │    ❌    │ Customer │
│ View own orders     │    ✅    │    ❌    │    ❌    │ Customer │
│ View vendor orders  │    ❌    │    ✅    │    ✅    │ Items    │
│ Update item status  │    ❌    │    ✅    │    ❌    │ Vendor   │
│ View all orders     │    ❌    │    ❌    │    ✅    │ Platform │
│ Override status     │    ❌    │    ❌    │    ✅    │ Disputes │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ RETURNS                                                          │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Request return      │    ✅    │    ❌    │    ❌    │ Customer │
│ View own returns    │    ✅    │    ❌    │    ❌    │ Customer │
│ View vendor returns │    ❌    │    ✅    │    ✅    │ Vendor   │
│ Respond to return   │    ❌    │    ✅    │    ❌    │ NEW      │
│ Approve return      │    ❌    │    ✅    │    ✅    │ Both     │
│ Reject return       │    ❌    │    ✅    │    ✅    │ Both     │
│ Arbitrate dispute   │    ❌    │    ❌    │    ✅    │ Final    │
│ Process refund      │    ❌    │    ❌    │    ✅    │ Platform │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ PAYOUTS                                                          │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ View own earnings   │    ❌    │    ✅    │    ❌    │ Vendor   │
│ View breakdown      │    ❌    │    ✅    │    ❌    │ NEW      │
│ Request payout      │    ❌    │    ✅    │    ❌    │ NEW      │
│ View payout history │    ❌    │    ✅    │    ✅    │ Both     │
│ Calculate payouts   │    ❌    │    ❌    │    ✅    │ Platform │
│ Approve payout      │    ❌    │    ❌    │    ✅    │ Platform │
│ Mark as paid        │    ❌    │    ❌    │    ✅    │ Platform │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ CATEGORIES                                                       │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ View categories     │    ✅    │    ✅    │    ✅    │ Public   │
│ Request category    │    ❌    │    ✅    │    ❌    │ NEW      │
│ Approve request     │    ❌    │    ❌    │    ✅    │ Platform │
│ Create category     │    ❌    │    ❌    │    ✅    │ Platform │
│ Set commission      │    ❌    │    ❌    │    ✅    │ Platform │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## 8. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    BAZARBD MARKETPLACE                           │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ CUSTOMER LAYER   │  │ VENDOR LAYER     │  │ ADMIN LAYER      │
│ (Buyer)          │  │ (Seller)         │  │ (Controller)     │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ • Browse         │  │ • Products       │  │ • Moderation     │
│ • Search         │  │ • Inventory      │  │ • Oversight      │
│ • Order          │  │ • Orders         │  │ • Policies       │
│ • Review         │  │ • Fulfillment    │  │ • Payouts        │
│ • Return         │  │ • Returns        │  │ • Analytics      │
│ • Support        │  │ • Finance        │  │ • Support        │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│ • Order Management    • Payment Processing                      │
│ • Product Catalog     • Commission Calculation                  │
│ • User Management     • Analytics & Reporting                   │
│ • Notification        • Search & Discovery                      │
│ • Delivery Tracking   • Review & Rating                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────┤
│ • Users           • Orders          • Payouts                   │
│ • Vendors         • Products        • Returns                   │
│ • Categories      • Reviews         • Transactions              │
└─────────────────────────────────────────────────────────────────┘
```

---

These diagrams illustrate the clear separation of responsibilities and workflows in the BazarBD marketplace system.
