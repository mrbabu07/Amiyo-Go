import { describe, expect, test } from "@jest/globals";
import {
  cn,
  getDiscountPercent,
  getInitials,
  getPaginationMeta,
  getStatusOptions,
  getStatusTone,
  isOptionSelected,
  normalizeStatus,
  normalizeSelectOptions,
} from "../utils";

describe("design system white-box helpers", () => {
  test("cn merges strings, arrays, and conditional object classes", () => {
    expect(cn("base", ["p-2", null], { active: true, hidden: false })).toBe("base p-2 active");
  });

  test("getStatusTone returns consistent labels for shared marketplace statuses", () => {
    expect(getStatusTone("approved")).toMatchObject({
      label: "Approved",
    });
    expect(getStatusTone("awaiting approval")).toMatchObject({
      key: "pending",
      label: "Pending",
    });
    expect(getStatusTone("delivered")).toMatchObject({
      label: "Delivered",
    });
    expect(getStatusTone("unknown_status").label).toBe("Unknown Status");
  });

  test("status helpers normalize aliases and create option labels from one registry", () => {
    expect(normalizeStatus("payment-failed")).toBe("failed");
    expect(normalizeStatus("canceled")).toBe("cancelled");
    expect(getStatusOptions(["pending", "paid", "refunded"])).toEqual([
      { value: "pending", label: "Pending", tone: "warning" },
      { value: "paid", label: "Paid", tone: "success" },
      { value: "refunded", label: "Refunded", tone: "refund" },
    ]);
  });

  test("getPaginationMeta clamps invalid pages and reports visible ranges", () => {
    expect(getPaginationMeta({ page: 20, pageSize: 10, total: 42 })).toEqual({
      page: 5,
      pageSize: 10,
      total: 42,
      totalPages: 5,
      start: 41,
      end: 42,
      hasPrevious: true,
      hasNext: false,
    });
  });

  test("price and identity helpers handle ecommerce edge cases", () => {
    expect(getDiscountPercent(80, 100)).toBe(20);
    expect(getDiscountPercent(120, 100)).toBe(0);
    expect(getInitials("Amiyo Go")).toBe("AG");
  });

  test("select helpers flatten groups and detect multi selections", () => {
    const options = normalizeSelectOptions([
      { label: "Daily needs", options: [{ value: "grocery", label: "Grocery" }] },
      { value: "fashion", label: "Fashion" },
    ]);

    expect(options).toEqual([
      { value: "grocery", label: "Grocery", group: "Daily needs" },
      { value: "fashion", label: "Fashion" },
    ]);
    expect(isOptionSelected("grocery", ["grocery"], true)).toBe(true);
    expect(isOptionSelected("grocery", "fashion")).toBe(false);
  });
});
