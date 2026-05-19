const adminGlobalSearchService = require("../services/adminGlobalSearchService");

const getDb = (req) =>
  req.app.locals.db ||
  req.app.locals.models?.Order?.collection?.db ||
  req.app.locals.models?.User?.collection?.db;

const parseTypes = (types = "") =>
  String(types || "")
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean);

exports.searchAdminResources = async (req, res) => {
  try {
    const query = String(req.query.q || req.query.search || "").trim();
    if (!query) {
      return res.json({ success: true, data: { query, results: [], grouped: {}, total: 0 } });
    }

    const data = await adminGlobalSearchService.searchAll(getDb(req), query, {
      limit: Number(req.query.limit || 5),
      totalLimit: Number(req.query.totalLimit || 24),
      types: parseTypes(req.query.types),
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error in searchAdminResources:", error);
    res.status(500).json({ success: false, error: "Failed to search admin resources" });
  }
};

exports.getAdminSearchResourceDetail = async (req, res) => {
  try {
    const { type, id } = req.params;
    const detail = await adminGlobalSearchService.getDetail(getDb(req), type, id);

    if (!detail) {
      return res.status(404).json({ success: false, error: "Resource not found" });
    }

    res.json({ success: true, data: detail });
  } catch (error) {
    console.error("Error in getAdminSearchResourceDetail:", error);
    res.status(500).json({ success: false, error: "Failed to load resource detail" });
  }
};
