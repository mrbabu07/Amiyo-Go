import { describe, expect, test } from "@jest/globals";
import {
  getEligibleVendorOrdersForBulkStatus,
  getVendorOrderBulkWorkflow,
  getVendorOrderStatus,
  isVendorOrderTerminal,
} from "../vendorOrderBulkActions";

describe("vendor order bulk action white-box behavior", () => {
  test("normalizes mixed status labels before eligibility checks", () => {
    expect(getVendorOrderStatus({ status: "Ready To Ship" })).toBe("ready_to_ship");
    expect(getVendorOrderStatus({ vendorOrderStatus: "pickup-ready" })).toBe("pickup_ready");
  });

  test("blocks terminal and backwards-moving fulfillment statuses", () => {
    const orders = [
      { _id: "1", status: "pending" },
      { _id: "2", status: "packed" },
      { _id: "3", status: "ready_to_ship" },
      { _id: "4", status: "shipped" },
      { _id: "5", status: "delivered" },
    ];

    expect(isVendorOrderTerminal(orders[4])).toBe(true);
    expect(getEligibleVendorOrdersForBulkStatus(orders, "pack").map((order) => order._id)).toEqual(["1"]);
    expect(getEligibleVendorOrdersForBulkStatus(orders, "ready_to_ship").map((order) => order._id)).toEqual(["1", "2"]);
    expect(getEligibleVendorOrdersForBulkStatus(orders, "pickup_ready").map((order) => order._id)).toEqual(["2", "3"]);
  });

  test("summarizes selected order workflow counts", () => {
    const workflow = getVendorOrderBulkWorkflow([
      { _id: "pending-1", status: "pending" },
      { _id: "packed-1", status: "packed" },
      { _id: "ready-1", status: "ready_to_ship" },
      { _id: "cancelled-1", status: "cancelled" },
    ]);

    expect(workflow.selectedCount).toBe(4);
    expect(workflow.printableOrders).toHaveLength(4);
    expect(workflow.counts).toEqual({
      pack: 1,
      ready_to_ship: 2,
      pickup_ready: 2,
    });
  });
});
