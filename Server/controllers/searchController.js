const { ObjectId } = require("mongodb");
const { createSearchProvider } = require("../services/search/searchProviderRegistry");

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const DEFAULT_TRENDING_SEARCHES = [
  "phone",
  "dress",
  "headphones",
  "watch",
  "bag",
  "shoes",
];

const normalizeId = (value) => {
  if (!value) return "";
  if (value.toString) return value.toString();
  return String(value);
};

const safeObjectId = (value) => {
  const id = normalizeId(value);
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
};

const idValues = (value) => {
  const id = normalizeId(value);
  const objectId = safeObjectId(id);
  return objectId ? [id, objectId] : [id];
};

const unique = (values = []) => [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const BD_DIVISION_LOCATION_LABELS = {
  barishal: "Barishal",
  chattogram: "Chattogram",
  dhaka: "Dhaka",
  khulna: "Khulna",
  mymensingh: "Mymensingh",
  rajshahi: "Rajshahi",
  rangpur: "Rangpur",
  sylhet: "Sylhet",
};

const BD_DIVISION_ID_LABELS = {
  1: "Chattogram",
  2: "Rajshahi",
  3: "Khulna",
  4: "Barishal",
  5: "Sylhet",
  6: "Dhaka",
  7: "Rangpur",
  8: "Mymensingh",
};

const DIVISION_LOCATION_ALIASES = [
  { key: "barishal", aliases: ["barishal", "barisal"] },
  { key: "chattogram", aliases: ["chattogram", "chattagram", "chittagong"] },
  { key: "dhaka", aliases: ["dhaka"] },
  { key: "khulna", aliases: ["khulna"] },
  { key: "mymensingh", aliases: ["mymensingh"] },
  { key: "rajshahi", aliases: ["rajshahi"] },
  { key: "rangpur", aliases: ["rangpur"] },
  { key: "sylhet", aliases: ["sylhet"] },
];

const normalizeLocationText = (value = "") => {
  const normalized = normalizeText(value);
  if (!normalized) return "";

  const division = DIVISION_LOCATION_ALIASES.find((item) =>
    item.aliases.some((alias) => normalized === alias || normalized.includes(alias)),
  );

  return division ? division.key : normalized;
};

const displayLocationValue = (value = "") => {
  const normalized = normalizeLocationText(value);
  return BD_DIVISION_LOCATION_LABELS[normalized] || String(value || "").trim();
};

const displayDivisionById = (value = "") =>
  BD_DIVISION_ID_LABELS[String(value || "").trim()] || "";

const tokenize = (value = "") =>
  normalizeText(value)
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token));

const levenshtein = (a = "", b = "") => {
  const left = String(a);
  const right = String(b);
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const temporary = row[j];
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
      previous = temporary;
    }
  }
  return row[right.length];
};

const fuzzyTokenMatch = (queryToken, candidateToken) => {
  if (!queryToken || !candidateToken) return 0;
  if (queryToken === candidateToken) return 1;
  if (candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken)) return 0.88;

  const maxLength = Math.max(queryToken.length, candidateToken.length);
  const lengthRatio = Math.min(queryToken.length, candidateToken.length) / maxLength;
  if (
    lengthRatio >= 0.75 &&
    (candidateToken.includes(queryToken) || queryToken.includes(candidateToken))
  ) {
    return 0.78;
  }

  if (maxLength < 4) return 0;
  const distance = levenshtein(queryToken, candidateToken);
  const similarity = 1 - distance / maxLength;
  return similarity >= 0.62 ? similarity : 0;
};

const bestTokenMatch = (queryToken, candidateTokens = []) =>
  candidateTokens.reduce((best, candidate) => Math.max(best, fuzzyTokenMatch(queryToken, candidate)), 0);

const buildDictionary = ({ products = [], categories = [] }) => {
  const terms = new Map();
  const add = (value, weight = 1) => {
    tokenize(value).forEach((term) => {
      if (term.length > 1) terms.set(term, (terms.get(term) || 0) + weight);
    });
  };

  products.forEach((product) => {
    add(product.title, 5);
    add(product.brand || product.attributes?.brand, 4);
    add(product.categoryName, 2);
    add(tagText(product.tags), 2);
  });
  categories.forEach((category) => add(category.name, 3));

  return [...terms.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);
};

const correctQueryTokens = (query, dictionary = []) => {
  const tokens = tokenize(query);
  const correctedTokens = tokens.map((token) => {
    let best = { term: token, score: 0 };
    dictionary.forEach((term) => {
      const score = fuzzyTokenMatch(token, term);
      if (score > best.score) best = { term, score };
    });
    return best.score >= 0.7 ? best.term : token;
  });

  return {
    originalTokens: tokens,
    correctedTokens,
    correctedQuery: correctedTokens.join(" "),
    corrected: correctedTokens.join(" ") !== tokens.join(" "),
  };
};

const getImage = (item = {}) => item.image || item.imageUrl || item.bannerImageUrl || item.images?.[0] || "";

const getBrand = (product = {}) =>
  product.brand || product.attributes?.brand || product.specifications?.brand || "";

const getDeliverySpeed = (product = {}, vendor = {}) => {
  const direct = product.deliverySpeed || product.shippingSpeed || product.deliveryEstimate;
  if (direct) return String(direct);
  const prep = vendor.deliverySettings?.preparationTime || vendor.processingTime;
  if (prep) return String(prep);
  return "standard";
};

const getDefaultPickupAddress = (vendor = {}) => {
  if (!Array.isArray(vendor.pickupAddresses) || vendor.pickupAddresses.length === 0) return null;
  return vendor.pickupAddresses.find((address) => address?.isDefault) || vendor.pickupAddresses[0];
};

const getLocationSources = (product = {}, vendor = {}) =>
  [
    product.location,
    product.pickupAddress,
    product.address,
    getDefaultPickupAddress(vendor),
    vendor.pickupAddress,
    vendor.address,
    vendor.businessAddress,
    vendor.returnAddress,
    product,
    vendor,
  ].filter((source) => source && typeof source === "object" && !Array.isArray(source));

const firstLocationValue = (sources = [], keys = []) => {
  for (const source of sources) {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  return "";
};

const getLocationParts = (product = {}, vendor = {}) => {
  const sources = getLocationSources(product, vendor);
  const divisionId = firstLocationValue(sources, ["divisionId"]);
  const districtId = firstLocationValue(sources, ["districtId"]);
  const upazilaId = firstLocationValue(sources, ["upazilaId", "thanaId"]);
  const unionId = firstLocationValue(sources, ["unionId"]);
  const division = firstLocationValue(sources, ["division"]) || displayDivisionById(divisionId);
  const district = firstLocationValue(sources, ["district", "city", "state"]);
  const upazila = firstLocationValue(sources, ["upazila", "thana"]);
  const union = firstLocationValue(sources, ["union", "unionName"]);
  const area = firstLocationValue(sources, ["area"]);

  const stringSource = [
    product.location,
    product.district,
    product.city,
    product.area,
    vendor.district,
    vendor.city,
    vendor.area,
  ].find((source) => typeof source === "string" && source.trim());

  const fallback = stringSource ? displayLocationValue(stringSource) : "";
  const location = division
    ? displayLocationValue(division)
    : district || upazila || union || area || fallback;

  return {
    location,
    division: division ? displayLocationValue(division) : "",
    divisionId,
    district,
    districtId,
    upazila: upazila || area,
    upazilaId,
    union,
    unionId,
  };
};

const getLocation = (product = {}, vendor = {}) => getLocationParts(product, vendor).location;

const tagText = (tags) => {
  if (Array.isArray(tags)) return tags.join(" ");
  return typeof tags === "string" ? tags : "";
};

const discountPercent = (product = {}) => {
  const price = Number(product.price || product.salePrice || 0);
  const original = Number(product.originalPrice || product.regularPrice || product.mrp || 0);
  if (!price || !original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
};

const serializeProduct = (product = {}) => ({
  ...product,
  _id: normalizeId(product._id),
  categoryId: normalizeId(product.categoryId),
  vendorId: normalizeId(product.vendorId),
  image: getImage(product),
  price: Number(product.price || product.salePrice || 0),
  originalPrice: Number(product.originalPrice || product.regularPrice || product.mrp || 0),
  stock: Number(product.stock || 0),
  views: Number(product.views || product.viewCount || 0),
});

const enrichProducts = ({ products = [], categories = [], vendors = [], reviews = [] }) => {
  const categoryMap = new Map(categories.map((category) => [normalizeId(category._id), category]));
  const vendorMap = new Map(vendors.map((vendor) => [normalizeId(vendor._id), vendor]));
  const reviewMap = reviews.reduce((map, review) => {
    const key = normalizeId(review.productId);
    if (!key) return map;
    const current = map.get(key) || { count: 0, ratingSum: 0 };
    current.count += 1;
    current.ratingSum += Number(review.rating || 0);
    map.set(key, current);
    return map;
  }, new Map());

  return products.map((product) => {
    const category = categoryMap.get(normalizeId(product.categoryId)) || {};
    const vendor = vendorMap.get(normalizeId(product.vendorId)) || {};
    const rating = reviewMap.get(normalizeId(product._id)) || { count: 0, ratingSum: 0 };
    const averageRating = rating.count ? Math.round((rating.ratingSum / rating.count) * 10) / 10 : Number(product.averageRating || product.rating || 0);
    const locationParts = getLocationParts(product, vendor);

    return serializeProduct({
      ...product,
      categoryName: product.categoryName || category.name || "",
      categorySlug: category.slug || "",
      categoryImage: category.image || category.imageUrl || "",
      vendorName: product.vendorName || vendor.shopName || vendor.businessName || "",
      vendorSlug: vendor.slug || "",
      brand: getBrand(product),
      averageRating,
      reviewCount: rating.count || Number(product.reviewCount || product.reviewsCount || 0),
      discountPercent: discountPercent(product),
      deliverySpeed: getDeliverySpeed(product, vendor),
      location: locationParts.location,
      locationDivision: locationParts.division,
      locationDivisionId: locationParts.divisionId,
      locationDistrict: locationParts.district,
      locationDistrictId: locationParts.districtId,
      locationUpazila: locationParts.upazila,
      locationUpazilaId: locationParts.upazilaId,
      locationUnion: locationParts.union,
      locationUnionId: locationParts.unionId,
      searchableText: normalizeText([
        product.title,
        product.description,
        getBrand(product),
        category.name,
        locationParts.location,
        locationParts.district,
        locationParts.upazila,
        locationParts.union,
        tagText(product.tags),
        product.sku,
      ].filter(Boolean).join(" ")),
      searchableTokens: tokenize([
        product.title,
        product.description,
        getBrand(product),
        category.name,
        locationParts.location,
        locationParts.district,
        locationParts.upazila,
        locationParts.union,
        tagText(product.tags),
        product.sku,
      ].filter(Boolean).join(" ")),
    });
  });
};

const isVisibleProduct = (product = {}) => {
  const approval = String(product.approvalStatus || "").toLowerCase();
  const status = String(product.status || "").toLowerCase();
  const moderation = String(product.moderationStatus || "").toLowerCase();
  if (product.isActive === false) return false;
  if (approval && approval !== "approved") return false;
  if (["draft", "pending", "pending_moderation", "rejected", "delisted", "inactive"].includes(status)) return false;
  if (["draft", "pending", "pending_moderation", "rejected", "delisted"].includes(moderation)) return false;
  return true;
};

const scoreProduct = (product, queryInfo) => {
  const { originalTokens = [], correctedTokens = [] } = queryInfo;
  const tokens = correctedTokens.length ? correctedTokens : originalTokens;
  if (!tokens.length) return 1;

  const normalizedQuery = correctedTokens.join(" ");
  let relevanceScore = 0;
  if (normalizedQuery && product.searchableText.includes(normalizedQuery)) relevanceScore += 12;

  tokens.forEach((token) => {
    const best = bestTokenMatch(token, product.searchableTokens);
    if (best >= 1) relevanceScore += 8;
    else if (best >= 0.88) relevanceScore += 6;
    else if (best >= 0.7) relevanceScore += 4;
    else if (best >= 0.62) relevanceScore += 2;
  });

  const brandTokens = tokenize(product.brand);
  if (tokens.some((token) => bestTokenMatch(token, brandTokens) >= 0.7)) relevanceScore += 5;
  const categoryTokens = tokenize(product.categoryName);
  if (tokens.some((token) => bestTokenMatch(token, categoryTokens) >= 0.7)) relevanceScore += 3;

  if (!relevanceScore) return 0;

  let score = relevanceScore;
  score += Math.min(3, Number(product.views || 0) / 100);
  score += Math.min(2, Number(product.reviewCount || 0) / 20);
  score += Number(product.averageRating || 0) * 0.2;

  return Math.round(score * 100) / 100;
};

const buildCategoryTree = (categories = [], products = [], homepageSlots = []) => {
  const active = categories
    .filter((category) => category.isActive !== false)
    .map((category) => ({ ...category, _id: normalizeId(category._id), parentId: normalizeId(category.parentId) }));
  const productCounts = products.reduce((map, product) => {
    const categoryId = normalizeId(product.categoryId);
    if (categoryId) map.set(categoryId, (map.get(categoryId) || 0) + 1);
    return map;
  }, new Map());
  const byParent = active.reduce((map, category) => {
    const key = category.parentId || "root";
    map.set(key, [...(map.get(key) || []), category]);
    return map;
  }, new Map());
  const bannerByCategory = new Map(
    homepageSlots
      .filter((slot) => slot.status !== "inactive" && slot.categoryId)
      .map((slot) => [normalizeId(slot.categoryId), slot]),
  );
  const brandMap = products.reduce((map, product) => {
    const categoryId = normalizeId(product.categoryId);
    const brand = getBrand(product);
    if (!categoryId || !brand) return map;
    const brands = map.get(categoryId) || new Map();
    brands.set(brand, (brands.get(brand) || 0) + 1);
    map.set(categoryId, brands);
    return map;
  }, new Map());

  const collectCategoryIds = (categoryId) => {
    const ids = [normalizeId(categoryId)];
    (byParent.get(normalizeId(categoryId)) || []).forEach((child) => {
      ids.push(...collectCategoryIds(child._id));
    });
    return ids;
  };

  const attach = (category) => {
    const children = (byParent.get(category._id) || [])
      .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0) || String(a.name).localeCompare(String(b.name)))
      .map(attach);
    const categoryIds = collectCategoryIds(category._id);
    const aggregateBrands = categoryIds.reduce((map, categoryId) => {
      (brandMap.get(categoryId) || new Map()).forEach((count, brand) => {
        map.set(brand, (map.get(brand) || 0) + count);
      });
      return map;
    }, new Map());
    const brands = [...aggregateBrands.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
    const banner = bannerByCategory.get(category._id);

    return {
      _id: category._id,
      name: category.name || "Category",
      slug: category.slug || category._id,
      description: category.description || "",
      image: category.image || category.imageUrl || "",
      icon: category.icon || category.iconUrl || "",
      productCount: categoryIds.reduce((sum, categoryId) => sum + (productCounts.get(categoryId) || 0), 0),
      featuredBrands: brands,
      banner: banner ? {
        title: banner.title || category.name,
        subtitle: banner.subtitle || banner.description || "",
        imageUrl: banner.imageUrl || banner.bannerImageUrl || category.image || "",
        link: banner.linkUrl || `/products?category=${category._id}`,
      } : null,
      children,
    };
  };

  return (byParent.get("root") || [])
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0) || String(a.name).localeCompare(String(b.name)))
    .map(attach);
};

const flattenCategories = (tree = []) => tree.flatMap((category) => [category, ...flattenCategories(category.children || [])]);

const categoryDescendantIds = (categories = [], selected = "") => {
  const selectedId = normalizeId(selected);
  if (!selectedId) return [];
  const selectedCategory = categories.find((category) => normalizeId(category._id) === selectedId || category.slug === selectedId);
  if (!selectedCategory) return [selectedId];
  const ids = [normalizeId(selectedCategory._id)];
  let changed = true;
  while (changed) {
    changed = false;
    categories.forEach((category) => {
      if (ids.includes(normalizeId(category.parentId)) && !ids.includes(normalizeId(category._id))) {
        ids.push(normalizeId(category._id));
        changed = true;
      }
    });
  }
  return ids;
};

const parseArrayParam = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(parseArrayParam);
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
};

const normalizeSort = (value = "best_match") => {
  const aliases = {
    best: "best_match",
    relevance: "best_match",
    "price-low": "price_asc",
    "price-high": "price_desc",
    topRated: "top_rated",
    mostReviews: "most_reviews",
  };
  return aliases[value] || value || "best_match";
};

const matchesLocationValue = (product = {}, { id, text, idField, textFields = [], normalize = normalizeText }) => {
  const filterId = id !== undefined && id !== null ? String(id).trim() : "";
  const filterText = text !== undefined && text !== null ? String(text).trim() : "";
  if (!filterId && !filterText) return true;

  if (filterId && String(product[idField] || "").trim() === filterId) return true;

  const normalizedFilter = normalize(filterText || filterId);
  if (!normalizedFilter) return true;

  return textFields.some((field) => {
    const normalizedValue = normalize(product[field] || "");
    return normalizedValue && (normalizedValue === normalizedFilter || normalizedValue.includes(normalizedFilter));
  });
};

const matchesLocationFilters = (product = {}, filters = {}) =>
  matchesLocationValue(product, {
    id: filters.divisionId,
    text: filters.location,
    idField: "locationDivisionId",
    textFields: ["locationDivision", "location"],
    normalize: normalizeLocationText,
  }) &&
  matchesLocationValue(product, {
    id: filters.districtId,
    text: filters.district,
    idField: "locationDistrictId",
    textFields: ["locationDistrict", "location"],
  }) &&
  matchesLocationValue(product, {
    id: filters.upazilaId,
    text: filters.upazila,
    idField: "locationUpazilaId",
    textFields: ["locationUpazila"],
  }) &&
  matchesLocationValue(product, {
    id: filters.unionId,
    text: filters.union,
    idField: "locationUnionId",
    textFields: ["locationUnion"],
  });

const matchesFilters = (product, filters = {}, categoryIds = []) => {
  if (categoryIds.length && !categoryIds.includes(normalizeId(product.categoryId))) return false;
  if (filters.minPrice !== undefined && Number(product.price || 0) < Number(filters.minPrice)) return false;
  if (filters.maxPrice !== undefined && Number(product.price || 0) > Number(filters.maxPrice)) return false;
  if (filters.brands?.length && !filters.brands.map(normalizeText).includes(normalizeText(product.brand))) return false;
  if (filters.minRating !== undefined && Number(product.averageRating || 0) < Number(filters.minRating)) return false;
  if (filters.discountMin !== undefined && Number(product.discountPercent || 0) < Number(filters.discountMin)) return false;
  if (filters.inStock && Number(product.stock || 0) <= 0 && !product.allowBackorder) return false;
  if (filters.deliverySpeed && !normalizeText(product.deliverySpeed).includes(normalizeText(filters.deliverySpeed))) return false;
  if (!matchesLocationFilters(product, filters)) return false;
  return true;
};

const sortProducts = (products = [], sort = "best_match") => {
  const normalized = normalizeSort(sort);
  const rows = [...products];
  rows.sort((a, b) => {
    if (normalized === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (normalized === "price_asc") return Number(a.price || 0) - Number(b.price || 0);
    if (normalized === "price_desc") return Number(b.price || 0) - Number(a.price || 0);
    if (normalized === "most_reviews") return Number(b.reviewCount || 0) - Number(a.reviewCount || 0);
    if (normalized === "top_rated") return Number(b.averageRating || 0) - Number(a.averageRating || 0);
    return Number(b.searchScore || 0) - Number(a.searchScore || 0) || Number(b.views || 0) - Number(a.views || 0);
  });
  return rows;
};

const buildFacets = (products = [], categories = []) => {
  const brands = new Map();
  const locations = new Map();
  const divisionLocations = new Map();
  const districtLocations = new Map();
  const upazilaLocations = new Map();
  const unionLocations = new Map();
  const deliverySpeeds = new Map();
  let min = 0;
  let max = 0;

  const addLocationCount = (map, id, text) => {
    const value = String(id || text || "").trim();
    if (!value) return;
    map.set(value, (map.get(value) || 0) + 1);
  };

  products.forEach((product, index) => {
    const price = Number(product.price || 0);
    if (index === 0 || price < min) min = price;
    if (price > max) max = price;
    if (product.brand) brands.set(product.brand, (brands.get(product.brand) || 0) + 1);
    if (product.location) {
      const location = displayLocationValue(product.location);
      locations.set(location, (locations.get(location) || 0) + 1);
    }
    addLocationCount(divisionLocations, product.locationDivisionId, product.locationDivision || product.location);
    addLocationCount(districtLocations, product.locationDistrictId, product.locationDistrict);
    addLocationCount(upazilaLocations, product.locationUpazilaId, product.locationUpazila);
    addLocationCount(unionLocations, product.locationUnionId, product.locationUnion);
    if (product.deliverySpeed) deliverySpeeds.set(product.deliverySpeed, (deliverySpeeds.get(product.deliverySpeed) || 0) + 1);
  });

  const mapToRows = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));

  return {
    priceRange: { min, max },
    brands: mapToRows(brands).slice(0, 30),
    locations: mapToRows(locations).slice(0, 20),
    locationBreakdown: {
      divisions: mapToRows(divisionLocations),
      districts: mapToRows(districtLocations),
      upazilas: mapToRows(upazilaLocations),
      unions: mapToRows(unionLocations),
    },
    deliverySpeeds: mapToRows(deliverySpeeds).slice(0, 12),
    categories: categories.map((category) => ({
      _id: normalizeId(category._id),
      name: category.name,
      slug: category.slug || "",
      image: category.image || category.imageUrl || "",
      icon: category.icon || category.iconUrl || "",
      displayOrder: category.displayOrder ?? 0,
      parentId: normalizeId(category.parentId),
      productCount: categoryDescendantIds(categories, category._id).reduce(
        (sum, categoryId) =>
          sum + products.filter((product) => normalizeId(product.categoryId) === categoryId).length,
        0,
      ),
    })),
  };
};

const buildAppliedFilters = (filters = {}, categories = []) => {
  const chips = [];
  const category = filters.category
    ? categories.find((item) => normalizeId(item._id) === normalizeId(filters.category) || item.slug === filters.category)
    : null;
  if (category) chips.push({ key: "category", label: `Category: ${category.name}`, value: normalizeId(category._id) });
  if (filters.brands?.length) filters.brands.forEach((brand) => chips.push({ key: "brands", label: `Brand: ${brand}`, value: brand }));
  if (filters.minPrice !== undefined) chips.push({ key: "minPrice", label: `From BDT ${filters.minPrice}`, value: filters.minPrice });
  if (filters.maxPrice !== undefined) chips.push({ key: "maxPrice", label: `Under BDT ${filters.maxPrice}`, value: filters.maxPrice });
  if (filters.minRating !== undefined) chips.push({ key: "minRating", label: `${filters.minRating}+ rated`, value: filters.minRating });
  if (filters.discountMin !== undefined) chips.push({ key: "discountMin", label: `${filters.discountMin}% off or more`, value: filters.discountMin });
  if (filters.inStock) chips.push({ key: "inStock", label: "In stock", value: true });
  if (filters.deliverySpeed) chips.push({ key: "deliverySpeed", label: `Delivery: ${filters.deliverySpeed}`, value: filters.deliverySpeed });
  if (filters.location || filters.divisionId) {
    chips.push({
      key: "location",
      label: `Division: ${filters.location ? displayLocationValue(filters.location) : displayDivisionById(filters.divisionId) || filters.divisionId}`,
      value: filters.location || filters.divisionId,
    });
  }
  if (filters.district || filters.districtId) {
    chips.push({ key: "district", label: `District: ${filters.district || filters.districtId}`, value: filters.district || filters.districtId });
  }
  if (filters.upazila || filters.upazilaId) {
    chips.push({ key: "upazila", label: `Upazila: ${filters.upazila || filters.upazilaId}`, value: filters.upazila || filters.upazilaId });
  }
  if (filters.union || filters.unionId) {
    chips.push({ key: "union", label: `Union: ${filters.union || filters.unionId}`, value: filters.union || filters.unionId });
  }
  return chips;
};

const buildQuerySummary = ({ query = "", totalCount = 0, appliedFilters = [] }) => {
  const parts = [`${totalCount} result${totalCount === 1 ? "" : "s"}`];
  if (query) parts.push(`for "${query}"`);
  appliedFilters.slice(0, 3).forEach((filter) => parts.push(filter.label));
  return parts.join(" - ");
};

const buildSuggestions = ({ query = "", correctedQuery = "", categories = [], products = [] }) => {
  const tokens = tokenize(correctedQuery || query);
  const categorySuggestions = categories
    .map((category) => ({
      type: "category",
      label: category.name,
      query: category.name,
      categoryId: normalizeId(category._id),
      score: tokens.reduce((sum, token) => sum + bestTokenMatch(token, tokenize(category.name)), 0),
    }))
    .filter((item) => item.score > 0 || !tokens.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const productTerms = products
    .flatMap((product) => [product.brand, product.categoryName, ...(product.title ? product.title.split(/\s+/).slice(0, 3) : [])])
    .filter(Boolean);
  const keywordSuggestions = unique([correctedQuery, ...productTerms, ...DEFAULT_TRENDING_SEARCHES])
    .filter((value) => normalizeText(value) !== normalizeText(query))
    .slice(0, 5)
    .map((value) => ({ type: "query", label: value, query: value }));

  return [...keywordSuggestions, ...categorySuggestions].slice(0, 8);
};

const runSearch = ({ products = [], categories = [], query = "", filters = {}, sort = "best_match", page = 1, limit = 24 }) => {
  const dictionary = buildDictionary({ products, categories });
  const queryInfo = correctQueryTokens(query, dictionary);
  const categoryIds = categoryDescendantIds(categories, filters.category);
  let scored = products.map((product) => ({
    ...product,
    searchScore: scoreProduct(product, queryInfo),
  }));

  if (queryInfo.originalTokens.length > 0) {
    scored = scored.filter((product) => product.searchScore >= 2);
  }

  const filtered = scored.filter((product) => matchesFilters(product, filters, categoryIds));
  const sorted = sortProducts(filtered, sort);
  const totalCount = sorted.length;
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(60, Math.max(1, Number(limit) || 24));
  const paged = sorted.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  const appliedFilters = buildAppliedFilters(filters, categories);

  return {
    query,
    correctedQuery: queryInfo.corrected ? queryInfo.correctedQuery : "",
    didYouMean: queryInfo.corrected ? queryInfo.correctedQuery : "",
    products: paged,
    totalCount,
    page: pageNumber,
    limit: pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    appliedFilters,
    summary: buildQuerySummary({ query: queryInfo.corrected ? queryInfo.correctedQuery : query, totalCount, appliedFilters }),
    suggestions: totalCount === 0
      ? buildSuggestions({ query, correctedQuery: queryInfo.correctedQuery, categories, products })
      : buildSuggestions({ query, correctedQuery: queryInfo.correctedQuery, categories, products: sorted }).slice(0, 5),
  };
};

const getTrendingSearches = async (db, products = []) => {
  try {
    const rows = await db.collection("searchQueries").aggregate([
      { $match: { query: { $exists: true, $ne: "" } } },
      { $group: { _id: "$normalizedQuery", query: { $last: "$query" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]).toArray();
    if (rows.length) return rows.map((row) => ({ query: row.query || row._id, count: row.count }));
  } catch {
    // Fall back to local product terms below.
  }

  const terms = new Map();
  products.forEach((product) => {
    [product.brand, product.categoryName, ...tokenize(product.title).slice(0, 2)].filter(Boolean).forEach((term) => {
      const key = String(term);
      terms.set(key, (terms.get(key) || 0) + 1);
    });
  });
  const rows = [...terms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([query, count]) => ({ query, count }));
  return rows.length ? rows : DEFAULT_TRENDING_SEARCHES.map((query) => ({ query, count: 0 }));
};

const loadSearchSource = async (req) => {
  const db = req.app.locals.db;
  const [rawProducts, categories, vendors, reviews, homepageSlots] = await Promise.all([
    db.collection("products").find({ isActive: { $ne: false } }).sort({ createdAt: -1 }).limit(600).toArray(),
    db.collection("categories").find({ isActive: { $ne: false } }).sort({ displayOrder: 1, name: 1 }).toArray(),
    db.collection("vendors").find({}).limit(200).toArray(),
    db.collection("reviews").find({ status: { $ne: "removed" } }).limit(2000).toArray(),
    db.collection("homepage_slots").find({ status: { $ne: "inactive" } }).sort({ position: 1 }).limit(80).toArray(),
  ]);
  const products = enrichProducts({
    products: rawProducts.filter(isVisibleProduct),
    categories,
    vendors,
    reviews,
  });
  return { db, products, categories, vendors, reviews, homepageSlots };
};

const recordSearch = async (req, query, resultCount = 0) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery || normalizedQuery.length < 2) return null;

  try {
    await req.app.locals.db.collection("searchQueries").insertOne({
      query: String(query).trim(),
      normalizedQuery,
      resultCount,
      userId: normalizeId(req.user?.uid),
      userObjectId: req.user?._id || null,
      createdAt: new Date(),
    });
  } catch {
    // Search analytics should not break browsing.
  }
  return null;
};

const getRecentSearches = async (req) => {
  if (!req.user?.uid) return [];
  try {
    const rows = await req.app.locals.db.collection("searchQueries")
      .find({ userId: normalizeId(req.user.uid) })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    return unique(rows.map((row) => row.query)).slice(0, 8).map((query) => ({ query }));
  } catch {
    return [];
  }
};

const buildSearchProvider = () => createSearchProvider({
  loadSource: loadSearchSource,
  runSearch,
  buildFacets,
  buildCategoryTree,
  flattenCategories,
  getTrendingSearches,
  getRecentSearches,
  buildDictionary,
  correctQueryTokens,
  scoreProduct,
  sortProducts,
  tokenize,
  bestTokenMatch,
});

const getAutocomplete = async (req, res) => {
  try {
    const data = await buildSearchProvider().autocomplete(req);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Autocomplete error:", error);
    res.status(500).json({ success: false, error: "Failed to load search autocomplete" });
  }
};

const getSearchResults = async (req, res) => {
  try {
    const { result, facets } = await buildSearchProvider().search(req);

    await recordSearch(req, result.correctedQuery || result.query, result.totalCount);

    res.json({
      success: true,
      data: {
        ...result,
        facets,
      },
    });
  } catch (error) {
    console.error("Search results error:", error);
    res.status(500).json({ success: false, error: "Failed to load search results" });
  }
};

const getSearchNavigation = async (req, res) => {
  try {
    res.json({
      success: true,
      data: await buildSearchProvider().navigation(req),
    });
  } catch (error) {
    console.error("Search navigation error:", error);
    res.status(500).json({ success: false, error: "Failed to load search navigation" });
  }
};

const saveSearchHistory = async (req, res) => {
  try {
    const query = String(req.body.query || "").trim();
    if (query.length < 2) return res.status(400).json({ success: false, error: "Search query is required" });
    await recordSearch(req, query, Number(req.body.resultCount || 0));
    res.json({ success: true, data: { query } });
  } catch (error) {
    console.error("Search history error:", error);
    res.status(500).json({ success: false, error: "Failed to save search history" });
  }
};

module.exports = {
  getAutocomplete,
  getSearchResults,
  getSearchNavigation,
  saveSearchHistory,
  _searchTestUtils: {
    buildAppliedFilters,
    buildCategoryTree,
    buildDictionary,
    buildFacets,
    buildQuerySummary,
    buildSuggestions,
    correctQueryTokens,
    enrichProducts,
    flattenCategories,
    fuzzyTokenMatch,
    levenshtein,
    normalizeText,
    runSearch,
    scoreProduct,
    tokenize,
  },
};
