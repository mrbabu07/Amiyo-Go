import { describe, expect, test } from "@jest/globals";
import { getVendorOrderBulkWorkflow } from "../vendorOrderBulkActions";

describe("vendor order bulk actions black-box behavior", () => {
  test("gives sellers the next useful bulk actions for selected fulfillment orders", () => {
    const workflow = getVendorOrderBulkWorkflow([
      { _id: "order-a", status: "processing" },
      { _id: "order-b", status: "packed" },
      { _id: "order-c", status: "pickup_ready" },
      { _id: "order-d", status: "returned" },
    ]);

    expect(workflow.selectedCount).toBe(4);
    expect(workflow.packableOrders.map((order) => order._id)).toEqual(["order-a"]);
    expect(workflow.readyToShipOrders.map((order) => order._id)).toEqual(["order-a", "order-b"]);
    expect(workflow.pickupReadyOrders.map((order) => order._id)).toEqual(["order-b"]);
  });
});
