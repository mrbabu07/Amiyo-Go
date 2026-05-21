const normalizeQuery = (query = "") => String(query || "").trim();

const lower = (value = "") => String(value || "").toLowerCase();

const encode = (value = "") => encodeURIComponent(String(value || "").trim());

const appendSearch = (path, value) => `${path}${path.includes("?") ? "&" : "?"}search=${encode(value)}`;

const isObjectId = (value = "") => /^[a-f0-9]{24}$/i.test(String(value).trim());

const isHashCode = (value = "") => /^#[a-z0-9]{6,}$/i.test(String(value).trim());

const prefixedValue = (query, prefixes = []) => {
  const escaped = prefixes.map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = query.match(new RegExp(`^(?:${escaped})[\\s:#-]+(.+)$`, "i"));
  return match?.[1]?.trim() || "";
};

const routeMatches = (query, routeTargets = [], type = "all") => {
  const search = lower(query);
  if (!search) return [];

  return routeTargets
    .filter((item) => {
      const haystack = [item.name, item.path, item.group].join(" ").toLowerCase();
      const matchesSearch = haystack.includes(search);
      const matchesType = type === "all" || lower(item.searchType || item.group) === type;
      return matchesSearch && matchesType;
    })
    .map((item) => ({
      ...item,
      kind: "route",
      typeLabel: item.group || "Page",
      description: "Open seller section",
    }));
};

const typeAllows = (selectedType, targetType) =>
  selectedType === "all" || selectedType === targetType;

const scopedSuggestion = ({ name, path, description, type, typeLabel }) => ({
  name,
  path,
  description,
  kind: "resource",
  type,
  typeLabel,
});

export const vendorSearchTypes = [
  { value: "all", label: "All" },
  { value: "orders", label: "Orders" },
  { value: "products", label: "Products" },
  { value: "returns", label: "Returns" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
];

export const getVendorResourceSuggestions = (query = "", selectedType = "all") => {
  const value = normalizeQuery(query);
  if (!value) return [];

  const suggestions = [];
  const orderValue =
    prefixedValue(value, ["order", "ord"]) ||
    (/^(?:ORD|AMG)[-_]?\d/i.test(value) ? value : "") ||
    (isHashCode(value) ? value : "");
  const productValue = prefixedValue(value, ["product", "sku", "item", "listing"]);
  const returnValue = prefixedValue(value, ["return", "refund", "rma"]);
  const voucherValue = prefixedValue(value, ["voucher", "coupon"]);
  const campaignValue = prefixedValue(value, ["campaign"]);
  const promotionValue = prefixedValue(value, ["promotion", "promo"]);
  const marketingValue = voucherValue || campaignValue || promotionValue;
  const payoutValue = prefixedValue(value, ["payout", "payment", "settlement", "transaction"]);

  if (orderValue && typeAllows(selectedType, "orders")) {
    suggestions.push(scopedSuggestion({
      name: `Find order ${orderValue}`,
      path: appendSearch("/vendor/orders?status=all", orderValue),
      description: "Search seller order queue",
      type: "orders",
      typeLabel: "Order",
    }));
  }

  if (productValue && typeAllows(selectedType, "products")) {
    suggestions.push(scopedSuggestion({
      name: isObjectId(productValue) ? `Open product ${productValue.slice(-6)}` : `Search products for ${productValue}`,
      path: isObjectId(productValue)
        ? `/vendor/products/${productValue}`
        : appendSearch("/vendor/products", productValue),
      description: "Find listings, SKUs, stock, and moderation status",
      type: "products",
      typeLabel: "Product",
    }));
  }

  if (returnValue && typeAllows(selectedType, "returns")) {
    suggestions.push(scopedSuggestion({
      name: `Find return ${returnValue}`,
      path: appendSearch("/vendor/returns", returnValue),
      description: "Search return and refund cases",
      type: "returns",
      typeLabel: "Return",
    }));
  }

  if (marketingValue && typeAllows(selectedType, "marketing")) {
    suggestions.push(scopedSuggestion({
      name: `Find promotion ${marketingValue}`,
      path: appendSearch(
        voucherValue
          ? "/vendor/marketing/vouchers"
          : campaignValue
            ? "/vendor/marketing/campaigns"
            : "/vendor/marketing/promotions",
        marketingValue,
      ),
      description: "Search campaigns, vouchers, and seller promotions",
      type: "marketing",
      typeLabel: "Marketing",
    }));
  }

  if (payoutValue && typeAllows(selectedType, "finance")) {
    suggestions.push(scopedSuggestion({
      name: `Find finance item ${payoutValue}`,
      path: appendSearch("/vendor/finance/transactions", payoutValue),
      description: "Search payout and settlement rows",
      type: "finance",
      typeLabel: "Finance",
    }));
  }

  if (!suggestions.length && isObjectId(value)) {
    if (typeAllows(selectedType, "orders")) {
      suggestions.push(scopedSuggestion({
        name: `Search orders for ID ${value.slice(-6)}`,
        path: appendSearch("/vendor/orders?status=all", value),
        description: "Broad seller order lookup",
        type: "orders",
        typeLabel: "Order",
      }));
    }
    if (typeAllows(selectedType, "products")) {
      suggestions.push(scopedSuggestion({
        name: `Open product ${value.slice(-6)}`,
        path: `/vendor/products/${value}`,
        description: "Use when this is a product ID",
        type: "products",
        typeLabel: "Product",
      }));
    }
  }

  if (!suggestions.length) {
    const fallbacks = [
      ["orders", "Search orders", "/vendor/orders", "Order queue"],
      ["products", "Search products", "/vendor/products", "Catalog listings"],
      ["returns", "Search returns", "/vendor/returns", "Return cases"],
      ["marketing", "Search promotions", "/vendor/marketing", "Campaigns and vouchers"],
      ["finance", "Search settlements", "/vendor/finance/transactions", "Finance transactions"],
    ];

    fallbacks.forEach(([type, name, path, typeLabel]) => {
      if (!typeAllows(selectedType, type)) return;
      suggestions.push(scopedSuggestion({
        name: `${name} for ${value}`,
        path: appendSearch(type === "orders" ? `${path}?status=all` : path, value),
        description: `Search ${typeLabel.toLowerCase()}`,
        type,
        typeLabel,
      }));
    });
  }

  return suggestions;
};

export const buildVendorSearchSuggestions = (query = "", routeTargets = [], selectedType = "all") => {
  const value = normalizeQuery(query);
  if (!value) return [];

  const seen = new Set();
  return [
    ...getVendorResourceSuggestions(value, selectedType),
    ...routeMatches(value, routeTargets, selectedType),
  ]
    .filter((item) => {
      if (!item.path || seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    })
    .slice(0, 8);
};

const fallbackByType = {
  orders: "/vendor/orders?status=all",
  products: "/vendor/products",
  returns: "/vendor/returns",
  marketing: "/vendor/marketing",
  finance: "/vendor/finance/transactions",
};

export const getVendorSearchSubmitPath = (query = "", suggestions = [], selectedType = "all") => {
  const value = normalizeQuery(query);
  if (!value) return "";
  if (suggestions[0]?.path) return suggestions[0].path;

  const basePath = fallbackByType[selectedType] || fallbackByType.orders;
  return appendSearch(basePath, value);
};
