const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { exportOrdersCsv } = require("../controllers/orderController");

const router = express.Router();

const normalizeOrderRows = (orders = []) =>
  orders.map((order) => ({
    orderId: order._id?.toString?.() || order.orderId || "",
    customer: order.customerName || order.userName || order.shippingAddress?.name || "",
    phone: order.phone || order.shippingAddress?.phone || "",
    status: order.status || "",
    paymentMethod: order.paymentMethod || "",
    paymentStatus: order.paymentStatus || "",
    total: Number(order.total || order.finalTotal || order.totalAmount || 0),
    discount: Number(order.totalDiscount || order.couponDiscount || 0),
    deliveryCharge: Number(order.deliveryCharge || 0),
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : "",
  }));

router.get("/export", verifyToken, verifyAdmin, async (req, res, next) => {
  const format = String(req.query.format || "csv").toLowerCase();
  if (format !== "xlsx" && format !== "excel") {
    return exportOrdersCsv(req, res, next);
  }

  try {
    const ExcelJS = require("exceljs");
    const Order = req.app.locals.models.Order;
    const result = await Order.findAllPaginated({
      ...req.query,
      page: Number(req.query.page || 1),
      limit: Math.min(Number(req.query.limit || 1000), 5000),
    });
    const rows = normalizeOrderRows(result.orders || result.data || []);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Orders");
    sheet.columns = [
      { header: "Order ID", key: "orderId", width: 28 },
      { header: "Customer", key: "customer", width: 22 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Status", key: "status", width: 16 },
      { header: "Payment Method", key: "paymentMethod", width: 18 },
      { header: "Payment Status", key: "paymentStatus", width: 18 },
      { header: "Total", key: "total", width: 14 },
      { header: "Discount", key: "discount", width: 14 },
      { header: "Delivery Charge", key: "deliveryCharge", width: 16 },
      { header: "Created At", key: "createdAt", width: 26 },
    ];
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="orders-${Date.now()}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      return res.status(501).json({ success: false, error: "Excel export requires the exceljs package" });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
