import { describe, expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import DeliveryEstimateWidget from "../DeliveryEstimateWidget";

describe("DeliveryEstimateWidget black-box behavior", () => {
  test("shows ETA, fee, service area, and trust note to shoppers", () => {
    render(
      <DeliveryEstimateWidget
        title="Delivery estimate"
        eta="1-3 business days"
        feeLabel="BDT 80"
        serviceArea="Dhaka, Dhanmondi"
        note="Fee is confirmed before order placement."
      />,
    );

    expect(screen.getByRole("region", { name: "Delivery estimate" })).toBeInTheDocument();
    expect(screen.getByText("1-3 business days")).toBeInTheDocument();
    expect(screen.getByText("BDT 80")).toBeInTheDocument();
    expect(screen.getByText("Dhaka, Dhanmondi")).toBeInTheDocument();
    expect(screen.getByText("Fee is confirmed before order placement.")).toBeInTheDocument();
  });

  test("renders vendor delivery breakdown with formatted fees", () => {
    render(
      <DeliveryEstimateWidget
        title="Delivery details"
        eta="2-4 business days"
        feeLabel="By seller"
        serviceArea="Chattogram"
        formatAmount={(amount) => `BDT ${amount}`}
        breakdown={[
          {
            vendorId: "v1",
            vendorName: "Fresh Shop",
            zoneLabel: "Metro delivery",
            deliveryFee: 70,
          },
          {
            vendorId: "v2",
            vendorName: "Grocery Hub",
            zoneLabel: "Free base delivery",
            deliveryFee: 0,
          },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Delivery details" })).toBeInTheDocument();
    expect(screen.getByText("Fresh Shop")).toBeInTheDocument();
    expect(screen.getByText("Metro delivery")).toBeInTheDocument();
    expect(screen.getByText("BDT 70")).toBeInTheDocument();
    expect(screen.getByText("Grocery Hub")).toBeInTheDocument();
    expect(screen.getAllByText("FREE").length).toBeGreaterThanOrEqual(1);
  });
});
