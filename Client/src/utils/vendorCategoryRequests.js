export const normalizeCategoryId = (id) => (id ? id.toString() : "");

export const getCategoryPathLabel = (request = {}) => {
  if (request.categoryPath) return request.categoryPath;
  if (Array.isArray(request.requestedCategoryPath) && request.requestedCategoryPath.length > 0) {
    return request.requestedCategoryPath.map((item) => item.name).filter(Boolean).join(" > ");
  }
  return request.categoryName || "Selected category";
};

export const buildCategoryPath = (category, byId) => {
  const path = [category];
  let parentId = normalizeCategoryId(category.parentId);
  const seen = new Set();

  while (parentId && byId.has(parentId) && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    path.unshift(parent);
    parentId = normalizeCategoryId(parent.parentId);
  }

  return path;
};

export const buildCategoryRequestOptions = (categories = []) => {
  const activeCategories = categories.filter((category) => category && category.isActive !== false);
  const byId = new Map(activeCategories.map((category) => [normalizeCategoryId(category._id), category]));

  return activeCategories
    .map((category) => {
      const path = buildCategoryPath(category, byId);
      const root = path[0] || category;
      const parent = path.length > 1 ? path[path.length - 2] : null;
      const id = normalizeCategoryId(category._id);
      const childCount = activeCategories.filter(
        (item) => normalizeCategoryId(item.parentId) === id,
      ).length;

      return {
        ...category,
        id,
        rootId: normalizeCategoryId(root._id),
        rootName: root.name,
        parentName: parent?.name || "",
        parentCategoryId: normalizeCategoryId(parent?._id),
        path,
        pathLabel: path.map((item) => item.name).join(" > "),
        depth: path.length - 1,
        childCount,
      };
    })
    .sort(
      (a, b) =>
        a.rootName.localeCompare(b.rootName) ||
        a.depth - b.depth ||
        a.pathLabel.localeCompare(b.pathLabel),
    );
};

export const buildRootCategoryGroups = (categoryOptions = []) => {
  const groups = new Map();

  categoryOptions.forEach((category) => {
    if (!groups.has(category.rootId)) {
      groups.set(category.rootId, {
        id: category.rootId,
        name: category.rootName,
        categoryCount: 0,
        subcategoryCount: 0,
        options: [],
      });
    }

    const group = groups.get(category.rootId);
    group.categoryCount += 1;
    if (category.depth > 0) group.subcategoryCount += 1;
    group.options.push(category);
  });

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const findCategoryRequestOption = (categoryOptions = [], categoryId) =>
  categoryOptions.find((category) => category.id === normalizeCategoryId(categoryId)) || null;
