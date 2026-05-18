const normalizeQuery = (query = "") => String(query || "").trim();

const lower = (value = "") => String(value || "").toLowerCase();

const encode = (value = "") => encodeURIComponent(String(value || "").trim());

const isObjectId = (value = "") => /^[a-f0-9]{24}$/i.test(String(value).trim());

const isHashOrderCode = (value = "") => /^#[a-z0-9]{6,}$/i.test(String(value).trim());

const getRouteMatches = (query, routeTargets = []) => {
  const search = lower(query);
  if (!search) return [];

  return routeTargets
    .filter((item) => [item.name, item.path].join(" ").toLowerCase().includes(search))
    .map((item) => ({
      ...item,
      kind: "route",
      description: "Open admin section",
    }));
};

const prefixedValue = (query, prefixes = []) => {
  const escaped = prefixes.map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = query.match(new RegExp(`^(?:${escaped})[\\s:#-]+(.+)$`, "i"));
  return match?.[1]?.trim() || "";
};

export const getAdminResourceSuggestions = (query = "") => {
  const value = normalizeQuery(query);
  if (!value) return [];

  const suggestions = [];
  const orderValue =
    prefixedValue(value, ["order", "ord"]) ||
    (/^(?:ORD|AMG)[-_]?\d/i.test(value) ? value : "") ||
    (isHashOrderCode(value) ? value : "");
  const vendorValue = prefixedValue(value, ["vendor", "seller", "shop"]);
  const productValue = prefixedValue(value, ["product", "sku", "item"]);
  const payoutValue = prefixedValue(value, ["payout", "payment"]);
  const returnValue = prefixedValue(value, ["return", "refund"]);
  const supportValue = prefixedValue(value, ["support", "ticket"]) || (/^(?:SUP|TKT)-?\w+$/i.test(value) ? value : "");

  if (orderValue) {
    suggestions.push({
      name: `Find order ${orderValue}`,
      path: `/admin/orders?search=${encode(orderValue)}`,
      kind: "resource",
      description: "Search order operations",
    });
  }

  if (vendorValue) {
    suggestions.push({
      name: isObjectId(vendorValue) ? `Open vendor ${vendorValue.slice(-6)}` : `Search vendors for ${vendorValue}`,
      path: isObjectId(vendorValue) ? `/admin/vendors/${vendorValue}` : `/admin/vendors?search=${encode(vendorValue)}`,
      kind: "resource",
      description: "Vendor profile and approval controls",
    });
  }

  if (productValue) {
    suggestions.push({
      name: isObjectId(productValue) ? `Open product ${productValue.slice(-6)}` : `Search products for ${productValue}`,
      path: isObjectId(productValue) ? `/admin/products/edit/${productValue}` : `/admin/products?search=${encode(productValue)}`,
      kind: "resource",
      description: "Catalog moderation workspace",
    });
  }

  if (payoutValue) {
    suggestions.push({
      name: `Find payout ${payoutValue}`,
      path: `/admin/payout-requests?status=all&search=${encode(payoutValue)}`,
      kind: "resource",
      description: "Finance payout queue",
    });
  }

  if (returnValue) {
    suggestions.push({
      name: `Find return ${returnValue}`,
      path: `/admin/returns?search=${encode(returnValue)}`,
      kind: "resource",
      description: "Return decision queue",
    });
  }

  if (supportValue) {
    suggestions.push({
      name: `Find support ticket ${supportValue}`,
      path: `/admin/support?search=${encode(supportValue)}`,
      kind: "resource",
      description: "Support SLA queue",
    });
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    suggestions.push({
      name: `Find customer or vendor ${value}`,
      path: `/admin/customers?search=${encode(value)}`,
      kind: "resource",
      description: "Customer and account lookup",
    });
  }

  if (/^\+?\d[\d\s-]{7,}$/.test(value)) {
    suggestions.push({
      name: `Find phone ${value}`,
      path: `/admin/customers?search=${encode(value)}`,
      kind: "resource",
      description: "Customer and order contact lookup",
    });
  }

  if (!suggestions.length && isObjectId(value)) {
    suggestions.push(
      {
        name: `Search orders for ID ${value.slice(-6)}`,
        path: `/admin/orders?search=${encode(value)}`,
        kind: "resource",
        description: "Safest broad ID lookup",
      },
      {
        name: `Open product ${value.slice(-6)}`,
        path: `/admin/products/edit/${value}`,
        kind: "resource",
        description: "Use when this is a product ID",
      },
      {
        name: `Open vendor ${value.slice(-6)}`,
        path: `/admin/vendors/${value}`,
        kind: "resource",
        description: "Use when this is a vendor ID",
      },
    );
  }

  return suggestions;
};

export const buildAdminSearchSuggestions = (query = "", routeTargets = []) => {
  const value = normalizeQuery(query);
  if (!value) return [];

  const seen = new Set();
  return [...getAdminResourceSuggestions(value), ...getRouteMatches(value, routeTargets)]
    .filter((item) => {
      if (!item.path || seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    })
    .slice(0, 8);
};

export const getAdminSearchSubmitPath = (query = "", suggestions = []) => {
  const value = normalizeQuery(query);
  if (!value) return "";
  return suggestions[0]?.path || `/admin/orders?search=${encode(value)}`;
};
