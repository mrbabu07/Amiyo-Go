import { describe, expect, test } from "@jest/globals";
import {
  getVendorGateStatus,
  getVendorKycStatus,
  normalizeSellerStatus,
} from "../vendorSellerCenter";

describe("vendor seller center white-box behavior", () => {
  test("normalizes mixed status labels into stable keys", () => {
    expect(normalizeSellerStatus("Under Review")).toBe("under_review");
    expect(normalizeSellerStatus("kyc-required")).toBe("kyc_required");
    expect(normalizeSellerStatus("", "Pending")).toBe("pending");
  });

  test("maps legacy verification levels into KYC workflow states", () => {
    expect(getVendorKycStatus({ verificationLevel: "verified" })).toBe("approved");
    expect(getVendorKycStatus({ verificationLevel: "kyc_pending" })).toBe("pending");
    expect(getVendorKycStatus({ verificationLevel: "basic" })).toBe("not_submitted");
  });

  test("keeps admins and inactive vendor states on the right gate path", () => {
    expect(getVendorGateStatus({ isAdmin: true })).toBe("active");
    expect(getVendorGateStatus({ vendorProfile: null, role: "customer" })).toBe("missing");
    expect(
      getVendorGateStatus({
        vendorProfile: { status: "suspended" },
        role: "vendor",
      }),
    ).toBe("suspended");
  });

  test("uses a role syncing state when vendor is approved before user role updates", () => {
    expect(
      getVendorGateStatus({
        vendorProfile: { status: "approved", kyc: { status: "approved" } },
        role: "customer",
      }),
    ).toBe("role_pending");
  });
});
