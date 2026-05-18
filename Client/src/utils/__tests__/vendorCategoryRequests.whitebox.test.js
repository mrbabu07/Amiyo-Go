import {
  buildCategoryRequestOptions,
  buildRootCategoryGroups,
  findCategoryRequestOption,
  getCategoryPathLabel,
} from "../vendorCategoryRequests";

describe("vendor category request helpers", () => {
  const categories = [
    { _id: "root-grocery", name: "Grocery", parentId: null },
    { _id: "fresh", name: "Fresh Food", parentId: "root-grocery" },
    { _id: "vegetables", name: "Vegetables", parentId: "fresh" },
    { _id: "root-fashion", name: "Fashion", parentId: null },
    { _id: "inactive", name: "Hidden", parentId: "root-fashion", isActive: false },
  ];

  test("builds request options with main group and subcategory path metadata", () => {
    const options = buildCategoryRequestOptions(categories);
    const vegetables = findCategoryRequestOption(options, "vegetables");

    expect(vegetables).toEqual(expect.objectContaining({
      rootId: "root-grocery",
      rootName: "Grocery",
      parentName: "Fresh Food",
      parentCategoryId: "fresh",
      pathLabel: "Grocery > Fresh Food > Vegetables",
      depth: 2,
    }));
    expect(options.some((category) => category.id === "inactive")).toBe(false);
  });

  test("groups subcategories under their main category", () => {
    const groups = buildRootCategoryGroups(buildCategoryRequestOptions(categories));
    const grocery = groups.find((group) => group.id === "root-grocery");

    expect(grocery).toEqual(expect.objectContaining({
      name: "Grocery",
      categoryCount: 3,
      subcategoryCount: 2,
    }));
  });

  test("formats saved request paths with a legacy category-name fallback", () => {
    expect(getCategoryPathLabel({
      requestedCategoryPath: [{ name: "Grocery" }, { name: "Vegetables" }],
    })).toBe("Grocery > Vegetables");

    expect(getCategoryPathLabel({ categoryName: "Electronics" })).toBe("Electronics");
  });
});
