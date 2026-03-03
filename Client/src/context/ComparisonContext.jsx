import { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "./ToastContext";

const ComparisonContext = createContext();

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error("useComparison must be used within ComparisonProvider");
  }
  return context;
};

export const ComparisonProvider = ({ children }) => {
  const [compareList, setCompareList] = useState(() => {
    const saved = localStorage.getItem("compareList");
    return saved ? JSON.parse(saved) : [];
  });
  const { success, warning, info } = useToast();

  useEffect(() => {
    localStorage.setItem("compareList", JSON.stringify(compareList));
  }, [compareList]);

  const addToCompare = (product) => {
    if (compareList.length >= 3) {
      warning("You can compare maximum 3 products at a time", {
        title: "Comparison Limit",
      });
      return false;
    }

    if (compareList.some((item) => item._id === product._id)) {
      info(`${product.title} is already in comparison`, {
        title: "Already Added",
      });
      return false;
    }

    setCompareList((prev) => [...prev, product]);
    success(`${product.title} added to comparison`, {
      title: "Added to Compare",
    });
    return true;
  };

  const removeFromCompare = (productId) => {
    const productToRemove = compareList.find((item) => item._id === productId);
    setCompareList((prev) => prev.filter((item) => item._id !== productId));

    if (productToRemove) {
      success(`${productToRemove.title} removed from comparison`, {
        title: "Removed from Compare",
      });
    }
  };

  const clearComparison = () => {
    setCompareList([]);
    success("Comparison list cleared", {
      title: "Comparison Cleared",
    });
  };

  const isInComparison = (productId) => {
    return compareList.some((item) => item._id === productId);
  };

  const compareCount = compareList.length;

  return (
    <ComparisonContext.Provider
      value={{
        compareList,
        addToCompare,
        removeFromCompare,
        clearComparison,
        isInComparison,
        compareCount,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
};
