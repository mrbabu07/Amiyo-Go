import { createContext, useState, useEffect } from "react";
import { useToast } from "./ToastContext";
import {
  getCartItemKey,
  getCartColorName,
  getItemMaxOrder,
} from "../utils/cartCheckout";

export const CartContext = createContext();

export default function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [savedForLater, setSavedForLater] = useState(() => {
    const saved = localStorage.getItem("cartSavedForLater");
    return saved ? JSON.parse(saved) : [];
  });
  const { success } = useToast();

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("cartSavedForLater", JSON.stringify(savedForLater));
  }, [savedForLater]);

  const matchesItem = (item, productId, selectedSize = null, selectedColor = null) =>
    item._id === productId &&
    (item.selectedSize || "no-size") ===
      (selectedSize || item.selectedSize || "no-size") &&
    (getCartColorName(item.selectedColor) || "no-color") ===
      (getCartColorName(selectedColor) ||
        getCartColorName(item.selectedColor) ||
        "no-color");

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
        quantity: Math.min(quantity, getItemMaxOrder(product)),
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
          (getCartColorName(item.selectedColor) || "no-color") ===
            (getCartColorName(selectedColor) || "no-color"),
      );

      if (existing) {
        isUpdate = true;
        return prev.map((item) =>
          item._id === product._id &&
          (item.selectedSize || "no-size") === (selectedSize || "no-size") &&
          (getCartColorName(item.selectedColor) || "no-color") ===
            (getCartColorName(selectedColor) || "no-color")
            ? {
                ...item,
                quantity: Math.min(item.quantity + quantity, getItemMaxOrder(item)),
              }
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
      removedItem = prev.find((item) =>
        matchesItem(item, productId, selectedSize, selectedColor),
      );

      return prev.filter(
        (item) => !matchesItem(item, productId, selectedSize, selectedColor),
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
        matchesItem(item, productId, selectedSize, selectedColor)
          ? { ...item, quantity: Math.min(quantity, getItemMaxOrder(item)) }
          : item,
      ),
    );
  };

  const saveForLater = (item) => {
    const key = getCartItemKey(item);
    setSavedForLater((prev) => {
      if (prev.some((savedItem) => getCartItemKey(savedItem) === key)) {
        return prev;
      }
      return [{ ...item, savedAt: Date.now() }, ...prev];
    });
    removeFromCart(item._id, item.selectedSize, item.selectedColor);
    setTimeout(() => {
      success(`${item.title} saved for later`);
    }, 0);
  };

  const moveSavedToCart = (item) => {
    const key = getCartItemKey(item);
    setSavedForLater((prev) =>
      prev.filter((savedItem) => getCartItemKey(savedItem) !== key),
    );
    addToCart(
      item,
      item.quantity || 1,
      item.selectedImage,
      item.selectedSize,
      item.selectedColor,
    );
  };

  const removeSavedItem = (item) => {
    const key = getCartItemKey(item);
    setSavedForLater((prev) =>
      prev.filter((savedItem) => getCartItemKey(savedItem) !== key),
    );
    setTimeout(() => {
      success(`${item.title} removed from saved items`);
    }, 0);
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
        saveForLater,
        moveSavedToCart,
        removeSavedItem,
        savedForLater,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
