import { describe, expect, jest, test, beforeEach, afterEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  getMyVendorProfile,
  getShopStatus,
  getVendorMarketingItems,
} from "../../../services/api";
import VendorHome from "../VendorHome";

jest.mock("../../../hooks/useAuth", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: jest.fn(),
}));

jest.mock("../../../components/workflow/RoleWorkflowPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="vendor-role-workflow">Workflow</div>,
}));

jest.mock("../../../services/api", () => ({
  getMyVendorProfile: jest.fn(),
  getShopStatus: jest.fn(),
  getVendorMarketingItems: jest.fn(),
}));

const stats = {
  totalRevenue: 1500,
  revenueGrowth: 10,
  totalOrders: 5,
  pendingOrders: 2,
  totalProducts: 3,
  lowStockProducts: 1,
  avgRating: 4.5,
  totalReviews: 8,
  salesChart: { labels: ["Mon"], data: [500], orders: [1] },
  actionCenter: {
    summary: { total: 2, critical: 1, high: 1, financeExposure: 700 },
    items: [
      {
        key: "late_shipments",
        title: "Late fulfillment needs action",
        detail: "2 orders crossed the SLA.",
        count: 2,
        priority: "critical",
        workflow: "Fulfillment",
        path: "/vendor/orders",
        actionLabel: "Process orders",
      },
      {
        key: "return_responses",
        title: "Return cases waiting",
        detail: "Review evidence.",
        count: 1,
        priority: "high",
        workflow: "Returns",
        path: "/vendor/returns",
        actionLabel: "Review returns",
      },
    ],
  },
  fulfillmentCommand: {
    active: 3,
    breached: 2,
    dueSoon: 1,
    nextDeadline: {
      orderId: "order-12345678",
      hoursRemaining: -4,
    },
  },
  financeCommand: {
    availableEstimate: 520,
    pendingPayouts: 400,
    codPending: 900,
    vendorDeductions: 330,
  },
  readiness: {
    score: 78,
    status: "watch",
    checks: [
      { key: "profile", label: "Shop profile", ready: true, required: true, path: "/vendor/shop/profile" },
      { key: "marketing", label: "Growth tools", ready: false, required: false, path: "/vendor/marketing" },
    ],
  },
};

describe("VendorHome seller command center", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      user: {
        getIdToken: jest.fn().mockResolvedValue("vendor-token"),
      },
    });
    useCurrency.mockReturnValue({ formatPrice: (value) => `BDT ${Number(value || 0).toLocaleString("en-US")}` });
    global.fetch = jest.fn((url) => {
      if (String(url).includes("/vendors/dashboard/stats")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, stats }) });
      }
      if (String(url).includes("/vendors/orders")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, orders: [] }) });
      }
      if (String(url).includes("/vendor/products")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, products: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    getShopStatus.mockResolvedValue({ data: { data: { isShopOpen: true, isCurrentlyOnVacation: false } } });
    getMyVendorProfile.mockResolvedValue({ data: { data: { shopName: "Dhaka Seller", phone: "01700000000", address: "Dhaka" } } });
    getVendorMarketingItems.mockResolvedValue({ data: { data: [] } });
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("shows seller action, finance, fulfillment, and readiness controls", async () => {
    render(
      <MemoryRouter>
        <VendorHome />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("vendor-action-center")).toBeInTheDocument();
    expect(screen.getByTestId("vendor-command-panels")).toBeInTheDocument();
    expect(screen.getByText("Late fulfillment needs action")).toBeInTheDocument();
    expect(screen.getByText("Payout and COD")).toBeInTheDocument();
    expect(screen.getByText("Packing and pickup")).toBeInTheDocument();
    expect(screen.getByText("Business setup")).toBeInTheDocument();
    expect(screen.getByText("BDT 520")).toBeInTheDocument();
  });
});
