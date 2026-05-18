import { describe, expect, jest, test } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { Button, StatusBadge } from "../foundation";
import { Input, Select } from "../forms";
import { Modal } from "../overlays";
import { StepIndicator } from "../feedback";
import { ProductCard, ProductGrid, QuantityStepper } from "../shopping";

function ClearableInputHarness() {
  const [value, setValue] = useState("secret");

  return (
    <Input
      label="Password"
      type="password"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      clearable
    />
  );
}

describe("design system black-box behavior", () => {
  test("Button exposes loading and disabled states without losing its label", () => {
    render(<Button loading>Saving</Button>);

    const button = screen.getByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  test("StatusBadge maps marketplace statuses into visible labels", () => {
    render(<StatusBadge status="refunded" />);

    expect(screen.getByText("Refunded")).toBeInTheDocument();
  });

  test("Input supports password reveal and clearable value workflows", async () => {
    const user = userEvent.setup();
    render(<ClearableInputHarness />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Clear input" }));
    expect(input).toHaveValue("");
  });

  test("Select handles searchable grouped multi-select choices", async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(
      <Select
        multiple
        searchable
        placeholder="Pick categories"
        defaultValue={[]}
        onChange={handleChange}
        options={[
          {
            label: "Daily needs",
            options: [
              { value: "grocery", label: "Grocery" },
              { value: "vegetable", label: "Vegetable" },
            ],
          },
          { value: "fashion", label: "Fashion" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick categories" }));
    await user.type(screen.getByPlaceholderText("Search..."), "gro");
    await user.click(screen.getByRole("option", { name: "Grocery" }));

    expect(handleChange).toHaveBeenLastCalledWith(["grocery"], expect.objectContaining({ value: "grocery" }));
  });

  test("Modal closes with Escape and keeps footer actions fixed in its structure", () => {
    const handleClose = jest.fn();
    render(
      <Modal
        open
        title="Order details"
        onClose={handleClose}
        footer={<Button>Confirm</Button>}
      >
        <p>Customer delivery information</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Order details" })).toBeInTheDocument();
    expect(screen.getByText("Customer delivery information")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test("Product grid and card show locked shopping information and actions", () => {
    const addToCart = jest.fn();
    render(
      <MemoryRouter>
        <ProductGrid
          products={[
            {
              _id: "p1",
              title: "Fresh tomato pack",
              vendorName: "Daily Needs",
              price: 80,
              originalPrice: 100,
              rating: 4.8,
              reviewCount: 12,
            },
          ]}
          renderProduct={(product) => <ProductCard product={product} onAddToCart={addToCart} />}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Fresh tomato pack")).toBeInTheDocument();
    expect(screen.getByText("Daily Needs")).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  test("QuantityStepper enforces min and max purchase limits", async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<QuantityStepper value={1} min={1} max={2} onChange={handleChange} />);

    await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(handleChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  test("StepIndicator marks checkout progress in order", () => {
    render(
      <StepIndicator
        current={1}
        steps={[
          { id: "address", label: "Address" },
          { id: "payment", label: "Payment" },
          { id: "review", label: "Review" },
        ]}
      />,
    );

    expect(screen.getByText("Address")).toBeInTheDocument();
    expect(screen.getByText("Payment")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });
});
