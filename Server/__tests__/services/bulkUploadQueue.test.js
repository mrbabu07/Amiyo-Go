const { __test__ } = require("../../services/bulkUploadQueue");

describe("bulk upload queue report helpers", () => {
  test("builds a compact partial-success snapshot for vendor UI", () => {
    const snapshot = __test__.buildReportSnapshot([
      ["row", "title", "status", "error", "productId"],
      [2, "Rice", "success", "", "product-1"],
      [3, "Fish", "failed", "Category not allowed", ""],
      [4, "Oil", "success", "", "product-2"],
    ]);

    expect(snapshot.reportSummary).toEqual({
      totalRows: 3,
      imported: 2,
      failed: 1,
      failedRows: [
        {
          rowNumber: 3,
          title: "Fish",
          status: "failed",
          error: "Category not allowed",
          productId: "",
        },
      ],
      hasMoreRows: false,
    });
    expect(snapshot.reportRows).toHaveLength(3);
  });

  test("validates missing or unassigned categories before import", () => {
    const categoryMap = new Map([["grocery", { _id: "cat-1", name: "Grocery" }]]);

    expect(__test__.validateRow({ title: "Rice", price: "70", stock: "10", category: "Grocery" }, 2, categoryMap).errors).toEqual([]);
    expect(__test__.validateRow({ title: "", price: "0", stock: "-1", category: "Unknown" }, 3, categoryMap).errors).toEqual([
      "Title is required",
      "Valid price is required",
      "Valid stock is required",
      "Category not allowed or not found: Unknown",
    ]);
  });
});
