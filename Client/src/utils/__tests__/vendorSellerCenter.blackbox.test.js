import { describe, expect, test } from "@jest/globals";
import {
  buildVendorActionItems,
  getVendorActionCount,
  getVendorGateStatus,
  getVendorReadiness,
} from "../vendorSellerCenter";

describe("vendor seller center black-box behavior", () => {
  test("allows an approved vendor with verified KYC into the seller center", () => {
    const vendorProfile = {
      status: "approved",
      kyc: { status: "approved" },
    };

    expect(getVendorGateStatus({ vendorProfile, role: "vendor" })).toBe("active");
    expect(getVendorReadiness(vendorProfile)).toMatchObject({
      score: 100,
      label: "Ready",
    });
  });

  test("shows KYC as the primary action when documents are missing", () => {
    const actions = buildVendorActionItems({
      status: "approved",
      verificationLevel: "basic",
    });

    expect(actions[0]).toMatchObject({
      id: "kyc-required",
      label: "Complete seller KYC",
      path: "/vendor/kyc",
      severity: "warning",
    });
    expect(getVendorActionCount(actions)).toBe(1);
  });

  test("blocks rejected KYC from operational seller pages", () => {
    const vendorProfile = {
      status: "approved",
      kyc: { status: "rejected" },
    };

    expect(getVendorGateStatus({ vendorProfile, role: "vendor" })).toBe("missing_kyc");
    expect(getVendorReadiness(vendorProfile)).toMatchObject({
      label: "Blocked",
    });
  });

  test("allows approved vendor staff through the seller status gate", () => {
    const vendorProfile = {
      status: "approved",
      kyc: { status: "approved" },
    };

    expect(getVendorGateStatus({ vendorProfile, role: "vendor_staff" })).toBe("active");
  });
});
