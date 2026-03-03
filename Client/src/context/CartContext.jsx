import { createContext, useState, useEffect } from "react";
import { useToast } from "./ToastContext";

export const CartContext = createContext();

export default function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });
  const { success } = useToast();

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (
    product,
    quantity = 1,
    selectedImage = null,
    selectedSize = null,
    selectedColor = null,
  ) => {
    let isUpdate = false;

    setCart((prev) => {
      const cartItem = {
        ...product,
        quantity,
        selectedImage:
          selectedImage ||
          product.image ||
          (product.images && product.images[0]),
        selectedSize: selectedSize || product.selectedSize,
        selectedColor: selectedColor || product.selectedColor,
        addedAt: Date.now(), // For unique identification if same product with different options
      };

      const existing = prev.find(
        (item) =>
          item._id === product._id &&
          (item.selectedSize || "no-size") === (selectedSize || "no-size") &&
          (item.selectedColor?.name || "no-color") ===
            (selectedColor?.name || "no-color"),
      );

      if (existing) {
        isUpdate = true;
        return prev.map((item) =>
          item._id === product._id &&
          (item.selectedSize || "no-size") === (selectedSize || "no-size") &&
          (item.selectedColor?.name || "no-color") ===
            (selectedColor?.name || "no-color")
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [...prev, cartItem];
    });

    // Show toast after state update
    setTimeout(() => {
      if (isUpdate) {
        success(`Updated ${product.title} quantity in cart`);
      } else {
        success(`${product.title} added to cart`);
      }
    }, 0);
  };

  const removeFromCart = (
    productId,
    selectedSize = null,
    selectedColor = null,
  ) => {
    let removedItem = null;

    setCart((prev) => {
      removedItem = prev.find(
        (item) =>
          item._id === productId &&
          (item.selectedSize || "no-size") ===
            (selectedSize || item.selectedSize || "no-size") &&
          (item.selectedColor?.name || "no-color") ===
            (selectedColor?.name || item.selectedColor?.name || "no-color"),
      );

      return prev.filter(
        (item) =>
          !(
            item._id === productId &&
            (item.selectedSize || "no-size") ===
              (selectedSize || item.selectedSize || "no-size") &&
            (item.selectedColor?.name || "no-color") ===
              (selectedColor?.name || item.selectedColor?.name || "no-color")
          ),
      );
    });

    // Show toast after state update
    if (removedItem) {
      setTimeout(() => {
        success(`${removedItem.title} removed from cart`);
      }, 0);
    }
  };

  const updateQuantity = (
    productId,
    quantity,
    selectedSize = null,
    selectedColor = null,
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSize, selectedColor);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item._id === productId &&
        (item.selectedSize || "no-size") ===
          (selectedSize || item.selectedSize || "no-size") &&
        (item.selectedColor?.name || "no-color") ===
          (selectedColor?.name || item.selectedColor?.name || "no-color")
          ? { ...item, quantity }
          : item,
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
    setTimeout(() => {
      success("Cart cleared successfully");
    }, 0);
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
