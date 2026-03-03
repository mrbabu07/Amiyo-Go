const FlashSale = require("../models/FlashSale");
const mongoose = require("mongoose");

// Define Product schema for querying
const productSchema = new mongoose.Schema({}, { strict: false });
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

// Get all active flash sales
exports.getActiveFlashSales = async (req, res) => {
  try {
    const now = new Date();

    const flashSales = await FlashSale.find({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
      $expr: { $lt: ["$soldCount", "$totalStock"] },
    })
      .populate("product")
      .sort({ endTime: 1 });

    // Update status for each sale
    flashSales.forEach((sale) => sale.updateStatus());

    res.json(flashSales);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching flash sales", error: error.message });
  }
};

// Get upcoming flash sales
exports.getUpcomingFlashSales = async (req, res) => {
  try {
    const now = new Date();

    const flashSales = await FlashSale.find({
      isActive: true,
      startTime: { $gt: now },
    })
      .populate("product")
      .sort({ startTime: 1 })
      .limit(10);

    res.json(flashSales);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching upcoming flash sales",
      error: error.message,
    });
  }
};

// Get all flash sales (admin)
exports.getAllFlashSales = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;

    const flashSales = await FlashSale.find(query)
      .populate("product")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await FlashSale.countDocuments(query);

    // Update status for each sale
    flashSales.forEach((sale) => sale.updateStatus());

    res.json({
      flashSales,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching flash sales", error: error.message });
  }
};

// Get single flash sale
exports.getFlashSaleById = async (req, res) => {
  try {
    const flashSale = await FlashSale.findById(req.params.id).populate(
      "product",
    );

    if (!flashSale) {
      return res.status(404).json({ message: "Flash sale not found" });
    }

    flashSale.updateStatus();
    await flashSale.save();

    res.json(flashSale);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching flash sale", error: error.message });
  }
};

// Create flash sale (admin)
exports.createFlashSale = async (req, res) => {
  try {
    const {
      title,
      description,
      product,
      flashPrice,
      startTime,
      endTime,
      totalStock,
      maxPerUser,
    } = req.body;

    // Validate product exists
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({ message: "Product not found" });
    }

    const originalPrice = productDoc.price;
    const discountPercentage = Math.round(
      ((originalPrice - flashPrice) / originalPrice) * 100,
    );

    const flashSale = new FlashSale({
      title,
      description,
      product,
      originalPrice,
      flashPrice,
      discountPercentage,
      startTime,
      endTime,
      totalStock,
      maxPerUser: maxPerUser || 5,
    });

    flashSale.updateStatus();
    await flashSale.save();

    const populatedSale = await FlashSale.findById(flashSale._id).populate(
      "product",
    );

    // Send push notification for new flash sale (if it's active)
    if (flashSale.status === "active") {
      try {
        const NotificationService = require("../services/notificationService");

        console.log("📱 Sending flash sale notification:", {
          flashSaleId: flashSale._id,
          title: flashSale.title,
          discountPercentage: flashSale.discountPercentage,
        });

        await NotificationService.sendFlashSaleAlert({
          _id: flashSale._id,
          title: flashSale.title,
          discountPercentage: flashSale.discountPercentage,
          product: productDoc,
        });

        console.log("✅ Flash sale notification sent successfully");
      } catch (notificationError) {
        console.error(
          "⚠️ Failed to send flash sale notification:",
          notificationError,
        );
        // Don't fail the flash sale creation if notification fails
      }
    }

    res.status(201).json(populatedSale);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating flash sale", error: error.message });
  }
};

// Update flash sale (admin)
exports.updateFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const flashSale = await FlashSale.findById(id);
    if (!flashSale) {
      return res.status(404).json({ message: "Flash sale not found" });
    }

    // Recalculate discount if prices change
    if (updates.flashPrice || updates.originalPrice) {
      const originalPrice = updates.originalPrice || flashSale.originalPrice;
      const flashPrice = updates.flashPrice || flashSale.flashPrice;
      updates.discountPercentage = Math.round(
        ((originalPrice - flashPrice) / originalPrice) * 100,
      );
    }

    Object.assign(flashSale, updates);
    flashSale.updateStatus();
    await flashSale.save();

    const populatedSale = await FlashSale.findById(id).populate("product");
    res.json(populatedSale);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating flash sale", error: error.message });
  }
};

// Delete flash sale (admin)
exports.deleteFlashSale = async (req, res) => {
  try {
    const flashSale = await FlashSale.findByIdAndDelete(req.params.id);

    if (!flashSale) {
      return res.status(404).json({ message: "Flash sale not found" });
    }

    res.json({ message: "Flash sale deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting flash sale", error: error.message });
  }
};

// Record a purchase (called when order is placed)
exports.recordPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1 } = req.body;

    const flashSale = await FlashSale.findById(id);

    if (!flashSale) {
      return res.status(404).json({ message: "Flash sale not found" });
    }

    if (!flashSale.isCurrentlyActive()) {
      return res.status(400).json({ message: "Flash sale is not active" });
    }

    if (flashSale.soldCount + quantity > flashSale.totalStock) {
      return res.status(400).json({ message: "Not enough stock available" });
    }

    flashSale.soldCount += quantity;
    flashSale.updateStatus();
    await flashSale.save();

    res.json(flashSale);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error recording purchase", error: error.message });
  }
};
