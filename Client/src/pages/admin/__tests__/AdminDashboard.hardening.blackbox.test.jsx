import { describe, expect, jest, test, beforeEach } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  bulkUpdateAdminCases,
  getAdminCaseAssignment,
  getAdminDashboardOverview,
  getAdminSavedViews,
} from "../../../services/api";
import AdminDashboard from "../AdminDashboard";

jest.mock("recharts", () => {
  const ChartPrimitive = () => <div />;
  const ResponsiveContainer = ({ children }) => <div>{children}</div>;
  return {
    Area: ChartPrimitive,
    AreaChart: ChartPrimitive,
    Bar: ChartPrimitive,
    BarChart: ChartPrimitive,
    CartesianGrid: ChartPrimitive,
    Legend: ChartPrimitive,
    ResponsiveContainer,
    Tooltip: ChartPrimitive,
    XAxis: ChartPrimitive,
    YAxis: ChartPrimitive,
  };
});

jest.mock("../../../hooks/useAuth", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: jest.fn(),
}));

jest.mock("../../../services/api", () => ({
  bulkUpdateAdminCases: jest.fn(),
  deleteAdminSavedView: jest.fn(),
  getAdminCaseAssignment: jest.fn(),
  getAdminDashboardOverview: jest.fn(),
  getAdminSavedViews: jest.fn(),
  saveAdminSavedView: jest.fn(),
  updateAdminCaseAssignment: jest.fn(),
}));

const dashboardPayload = {
  updatedAt: "2026-05-19T08:00:00.000Z",
  kpis: {
    todayGmv: 1000,
    todayOrders: 2,
    totalOrders: 12,
    newUsers: 3,
    newVendors: 1,
    pendingPayouts: 1,
    payoutExposure: 500,
    activeDisputes: 1,
    activeVendors: 4,
    supportOpen: 2,
    supportSlaBreaches: 1,
    reviewModeration: 1,
    failedNotifications: 1,
    failedBulkJobs: 0,
    refundAmount: 100,
    refundRate: 2,
  },
  revenueTotals: { gmv: 1000, commission: 100, refunds: 100 },
  comparison: {
    gmvChange: 10,
    ordersChange: 5,
    commissionChange: 8,
    refundsChange: -2,
    refundRateChange: 0.5,
  },
  opsSummary: {
    supportOpen: 2,
    supportSlaBreaches: 1,
    failedNotifications: 1,
    failedBulkJobs: 0,
    failedPayments: 1,
    analyticsCronStatus: "running",
    analyticsUpdatedAt: "2026-05-19T07:50:00.000Z",
  },
  revenueSeries: [],
  orderFunnel: [],
  activityFeed: [],
  healthAlerts: [],
  exceptionInbox: {
    summary: {
      total: 1,
      critical: 1,
      breached: 1,
      financeExposure: 500,
      owners: [{ owner: "Support", count: 1 }],
    },
    items: [
      {
        id: "support-ticket-1",
        caseKey: "support:ticket-1",
        type: "support",
        title: "Support ticket waiting",
        detail: "Customer is waiting for a reply.",
        workflow: "Support",
        owner: "Support",
        priority: "critical",
        status: "open",
        ageHours: 26,
        dueAt: "2026-05-19T06:00:00.000Z",
        breached: true,
        nextAction: "Assign, reply, resolve, or escalate",
        actionLabel: "Open ticket queue",
        actions: [{ label: "Open ticket queue", path: "/admin/support" }],
        case: { status: "open", assignedTo: "", priority: "critical", dueAt: null },
      },
    ],
  },
  adminHardening: {
    staffWorkload: {
      totalOpen: 1,
      assigned: 0,
      unassigned: 1,
      overdue: 1,
      critical: 1,
      staff: [{ assignee: "Unassigned", open: 1, critical: 1, overdue: 1, topWorkflow: "Support" }],
    },
    financeReconciliation: {
      codOutstanding: 400,
      codOrders: 1,
      refundExposure: 100,
      payoutHolds: 50,
      pendingPayoutExposure: 500,
      vendorDeductions: 25,
      unresolvedBuckets: 4,
      status: "critical",
    },
    integrationReadiness: {
      ready: 2,
      watch: 1,
      manual: 1,
      integrations: [
        { key: "courier", label: "Courier adapters", status: "manual", detail: "Manual logistics state machine is active." },
        { key: "event_bus", label: "Marketplace event bus", status: "ready", detail: "Mongo outbox is active." },
      ],
    },
  },
  topVendors: [],
  topCategories: [],
  topProductsToday: [],
  pendingActions: {
    vendorApprovals: 0,
    productModeration: 0,
    payoutRequests: 1,
    returnDisputes: 0,
    kycReviews: 0,
    supportTickets: 1,
    reviewModeration: 0,
    failedNotifications: 1,
  },
};

describe("AdminDashboard hardening workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { email: "admin@amiyo.test" } });
    useCurrency.mockReturnValue({ formatPrice: (value) => `৳${Number(value || 0).toLocaleString("en-US")}` });
    getAdminDashboardOverview.mockResolvedValue({ data: { data: dashboardPayload } });
    getAdminSavedViews.mockResolvedValue({
      data: {
        data: [
          {
            key: "admin:admin_dashboard:high-risk",
            name: "High Risk",
            filters: { exceptionFilter: "support", range: "7d", vendorSort: "gmv", vendorFilter: "" },
          },
        ],
      },
    });
    getAdminCaseAssignment.mockResolvedValue({ data: { data: null } });
    bulkUpdateAdminCases.mockResolvedValue({ data: { data: [] } });
  });

  test("supports saved admin views, bulk case actions, hardening panels, and E2E hooks", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("admin-exception-inbox")).toBeInTheDocument();
    expect(screen.getByTestId("admin-hardening-panels")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "High Risk" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select visible" }));
    const bulkBar = screen.getByTestId("admin-bulk-case-actions");
    fireEvent.change(within(bulkBar).getByPlaceholderText("Assign to"), {
      target: { value: "ops@amiyo.test" },
    });
    fireEvent.change(within(bulkBar).getByDisplayValue("Status"), {
      target: { value: "in_progress" },
    });
    fireEvent.click(within(bulkBar).getByRole("button", { name: /apply/i }));

    await waitFor(() => {
      expect(bulkUpdateAdminCases).toHaveBeenCalledWith(expect.objectContaining({
        caseKeys: ["support:ticket-1"],
        assignedTo: "ops@amiyo.test",
        status: "in_progress",
      }));
    });
  });
});
