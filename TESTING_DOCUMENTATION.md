# Amiyo-Go Testing Documentation

Last verified: May 18, 2026

## Scope

Amiyo-Go has two Jest workspaces:

- `Client`: React/Vite frontend tests running in `jsdom`.
- `Server`: Node/Express backend tests running in the `node` environment with coverage enabled.

The project now includes explicit black-box and white-box coverage examples on both sides of the app. Black-box tests assert user-facing or API-facing behavior without relying on internal implementation details. White-box tests cover internal helper branches, calculations, state mapping, and edge cases that are easier to validate directly.

## Test Commands

Run frontend checks:

```bash
cd Client
npm run lint -- --quiet
npm test
npm run build
```

Run backend checks:

```bash
cd Server
npm test -- --runInBand
```

Run focused frontend black-box and white-box tests:

```bash
cd Client
npm test -- --runTestsByPath src/utils/__tests__/supportQueue.blackbox.test.js src/utils/__tests__/supportQueue.whitebox.test.js
npm test -- --runTestsByPath src/utils/__tests__/customerNotifications.blackbox.test.js src/utils/__tests__/customerNotifications.whitebox.test.js
npm test -- --runTestsByPath src/utils/__tests__/vendorSellerCenter.blackbox.test.js src/utils/__tests__/vendorSellerCenter.whitebox.test.js
npm test -- --runTestsByPath src/utils/__tests__/vendorProductDetail.blackbox.test.js src/utils/__tests__/vendorProductDetail.whitebox.test.js
npm test -- --runTestsByPath src/utils/__tests__/vendorReturnDispute.blackbox.test.js src/utils/__tests__/vendorReturnDispute.whitebox.test.js
npm test -- --runTestsByPath src/utils/__tests__/vendorOrderDetail.blackbox.test.js src/utils/__tests__/vendorOrderDetail.whitebox.test.js
npm test -- --runTestsByPath src/utils/__tests__/vendorStaffPermissions.blackbox.test.js src/utils/__tests__/vendorStaffPermissions.whitebox.test.js
```

Run focused backend black-box and white-box tests:

```bash
cd Server
npm test -- --runInBand --runTestsByPath __tests__/controllers/supportController.blackbox.test.js __tests__/controllers/supportController.whitebox.test.js
npm test -- --runInBand --runTestsByPath __tests__/controllers/returnController.vendorDetail.test.js
```

## Current Coverage Map

### Frontend

- Black-box UI behavior:
  - `Client/src/components/ui/__tests__/designSystem.blackbox.test.jsx`
  - `Client/src/components/__tests__/DeliveryEstimateWidget.blackbox.test.jsx`
  - `Client/src/utils/__tests__/customerOrders.blackbox.test.js`
  - `Client/src/utils/__tests__/customerNotifications.blackbox.test.js`
  - `Client/src/utils/__tests__/supportQueue.blackbox.test.js`
  - `Client/src/utils/__tests__/vendorProductDetail.blackbox.test.js`
  - `Client/src/utils/__tests__/vendorOrderDetail.blackbox.test.js`
  - `Client/src/utils/__tests__/vendorReturnDispute.blackbox.test.js`
  - `Client/src/utils/__tests__/vendorSellerCenter.blackbox.test.js`
  - `Client/src/utils/__tests__/vendorStaffPermissions.blackbox.test.js`
- White-box helper behavior:
  - `Client/src/components/ui/__tests__/designSystem.whitebox.test.js`
  - `Client/src/utils/__tests__/cartCheckout.whitebox.test.js`
  - `Client/src/utils/__tests__/customerOrders.whitebox.test.js`
  - `Client/src/utils/__tests__/customerNotifications.whitebox.test.js`
  - `Client/src/utils/__tests__/supportQueue.whitebox.test.js`
  - `Client/src/utils/__tests__/vendorCategoryRequests.whitebox.test.js`
  - `Client/src/utils/__tests__/vendorProductDetail.whitebox.test.js`
  - `Client/src/utils/__tests__/vendorOrderDetail.whitebox.test.js`
  - `Client/src/utils/__tests__/vendorReturnDispute.whitebox.test.js`
  - `Client/src/utils/__tests__/vendorSellerCenter.whitebox.test.js`
  - `Client/src/utils/__tests__/vendorStaffPermissions.whitebox.test.js`
- Route guard behavior:
  - `Client/src/routes/__tests__/guards.blackbox.test.jsx`

### Backend

- Black-box API/helper contracts:
  - `Server/__tests__/controllers/categoryRequestController.test.js`
  - `Server/__tests__/controllers/returnController.vendorDetail.test.js`
  - `Server/__tests__/controllers/supportController.blackbox.test.js`
  - `Server/__tests__/routes.health.test.js`
  - Existing route, controller, model, service, and utility Jest tests under `Server/__tests__`.
- White-box helper behavior:
  - `Server/__tests__/controllers/supportController.whitebox.test.js`
  - `Server/__tests__/middleware/audit.test.js`
  - `Server/__tests__/middleware/idempotency.test.js`
  - `Server/__tests__/middleware/rateLimiter.test.js`
  - `Server/__tests__/utils/envValidation.test.js`
  - `Server/__tests__/utils/permissions.rbac.test.js`
  - Existing service and utility tests for delivery, checkout notes, promotions, loyalty, invoices, campaigns, and marketplace policies.

## Black-Box Testing Rules

Use black-box tests when the behavior should remain stable even if the implementation changes.

Good targets:

- Customer-visible UI workflows.
- API response shape.
- Form validation outcomes.
- Cart, checkout, delivery, support, and order behavior.
- Empty states, loading states, and disabled states.

Naming convention:

```text
featureName.blackbox.test.js
featureName.blackbox.test.jsx
```

## White-Box Testing Rules

Use white-box tests when the implementation has important internal branches or edge cases.

Good targets:

- Fee calculations.
- SLA and status mapping.
- Sanitizers and normalizers.
- Role/permission helpers.
- Promotion, voucher, and commission rules.
- Date, currency, and address fallback behavior.

Naming convention:

```text
featureName.whitebox.test.js
featureName.whitebox.test.jsx
```

## Jest Setup

Frontend Jest config:

- File: `Client/jest.config.cjs`
- Environment: `jsdom`
- Roots: `Client/src`
- Setup: `Client/src/setupTests.js`
- Transform: `babel-jest`

Backend Jest config:

- File: `Server/jest.config.js`
- Environment: `node`
- Coverage directory: `Server/coverage`
- Coverage targets: controllers, middleware, models, and utils.

## Verification Checklist

Before pushing frontend or backend changes:

1. Run the relevant focused tests for the touched area.
2. Run all tests in the touched workspace.
3. For frontend UI changes, run lint and production build.
4. For backend changes, run the full Jest suite with `--runInBand` if database or model mocks are shared.
5. Keep black-box tests focused on public behavior.
6. Keep white-box tests focused on branching logic and edge cases.

## Latest Local Verification

The latest completed full-project verification:

- `Client`: `npm test` passed, 22 suites / 89 tests.
- `Client`: `npm run lint -- --quiet` passed.
- `Client`: `npm run build` passed.
- `Server`: `npm test -- --runInBand` passed, 62 suites / 398 tests.
- Focused backend rate limiter analytics/defaults test passed, 1 suite / 7 tests.
- Focused backend Phase 1 reliability/security tests passed, 5 suites / 13 tests.
- Focused backend black-box and white-box support tests remain covered by the full backend run.
- Focused frontend customer order journey tests passed, 2 suites / 7 tests.
- Focused frontend customer notification center tests passed, 2 suites / 8 tests.
- Focused frontend vendor seller-center tests passed, 2 suites / 7 tests.
- Focused frontend vendor product detail tests passed, 2 suites / 7 tests.
- Focused frontend vendor return dispute tests passed, 2 suites / 9 tests.
- Focused frontend vendor order detail tests passed, 2 suites / 8 tests.
- Focused frontend vendor staff permission tests and route guard tests passed, 5 suites / 20 tests.
- Focused frontend vendor staff permission matrix tests passed, 2 suites / 8 tests.
- Focused backend vendor return detail test passed, 1 suite / 3 tests.
- Focused backend API routing hardening tests passed, 3 suites / 124 tests.
