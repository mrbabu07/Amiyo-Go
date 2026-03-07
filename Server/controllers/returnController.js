const { ObjectId } = require("mongodb");
const emailService = require("../services/emailService");

const getAllReturns = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const User = req.app.locals.models.User;
    const db = req.app.locals.db;

    const returns = await Return.findAll();

    // Populate user information for each return
    const returnsWithUserInfo = await Promise.all(
      returns.map(async (returnItem) => {
        try {
          // Get user from Firebase UID
          const user = await User.findByFirebaseUid(returnItem.userId);

          // Get order to fetch shipping info - convert orderId string to ObjectId
          const order = await db.collection("orders").findOne({
            _id: new ObjectId(returnItem.orderId),
          });

          return {
            ...returnItem,
            userInfo: user
              ? {
                  name: user.name || order?.shippingInfo?.name || "N/A",
                  email: user.email || order?.shippingInfo?.email || "N/A",
                  phone: order?.shippingInfo?.phone || "N/A",
                }
              : {
                  name: order?.shippingInfo?.name || "N/A",
                  email: order?.shippingInfo?.email || "N/A",
                  phone: order?.shippingInfo?.phone || "N/A",
                },
          };
        } catch (error) {
          console.error(
            `Error fetching user info for return ${returnItem._id}:`,
            error,
          );
          return {
            ...returnItem,
            userInfo: {
              name: "N/A",
              email: "N/A",
              phone: "N/A",
            },
          };
        }
      }),
    );

    res.json({ success: true, data: returnsWithUserInfo });
  } catch (error) {
    console.error("Error fetching returns:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getUserReturns = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const userId = req.user.uid;

    const returns = await Return.findByUserId(userId);
    res.json({ success: true, data: returns });
  } catch (error) {
    console.error("Error fetching user returns:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getReturnById = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const { id } = req.params;
    const userId = req.user.uid;
    const isAdmin = req.dbUser?.role === "admin";

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
      return res
        .status(404)
        .json({ success: false, error: "Return request not found" });
    }

    // Users can only view their own returns, admins can view all
    if (!isAdmin && returnRequest.userId !== userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    res.json({ success: true, data: returnRequest });
  } catch (error) {
    console.error("Error fetching return:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createReturnRequest = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const userId = req.user.uid;
    const {
      orderId,
      productId,
      reason,
      description,
      images = [],
      refundMethod,
      refundAccountNumber,
    } = req.body;

    if (!orderId || !productId || !reason) {
      return res.status(400).json({
        success: false,
        error: "Order ID, Product ID, and reason are required",
      });
    }

    // Check if return is allowed for this product
    const canReturn = await Return.canReturnProduct(orderId, productId, userId);
    if (!canReturn.canReturn) {
      return res.status(400).json({
        success: false,
        error: canReturn.error,
      });
    }

    const orderProduct = canReturn.orderProduct;

    // Calculate refund amount and track vendor/commission info
    const refundAmount = orderProduct.price * orderProduct.quantity;
    const vendorEarningAmount = orderProduct.vendorEarningAmount || 0;
    const adminCommissionAmount = orderProduct.adminCommissionAmount || 0;
    const commissionRateSnapshot = orderProduct.commissionRateSnapshot || 0;

    const returnData = {
      userId,
      orderId,
      productId,
      productTitle: orderProduct.title || orderProduct.name,
      productPrice: orderProduct.price,
      quantity: orderProduct.quantity,
      reason,
      description,
      images,
      refundMethod,
      refundAccountNumber,
      refundAmount,
      // Track vendor and commission info
      vendorId: orderProduct.vendorId || null,
      vendorEarningAmount,
      adminCommissionAmount,
      commissionRateSnapshot,
      categoryId: orderProduct.categoryId || null,
    };

    const returnId = await Return.create(returnData);

    // Send return confirmation email
    try {
      const User = req.app.locals.models.User;
      const user = await User.findByFirebaseUid(userId);

      await emailService.sendReturnConfirmation({
        userEmail: user?.email || req.user.email,
        userName: user?.name || req.user.name || "Customer",
        returnId: returnId.toString(),
        orderId,
        reason,
        refundAmount: returnData.refundAmount,
      });
      console.log("✅ Return confirmation email sent");
    } catch (emailError) {
      console.error("⚠️ Failed to send return confirmation email:", emailError);
      // Don't fail the return creation if email fails
    }

    res.status(201).json({
      success: true,
      data: { id: returnId },
      message: "Return request created successfully",
    });
  } catch (error) {
    console.error("Error creating return request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateReturnStatus = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required",
      });
    }

    const validStatuses = [
      "pending",
      "approved",
      "rejected",
      "processing",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const result = await Return.updateStatus(id, status, adminNotes);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Return request not found",
      });
    }

    res.json({
      success: true,
      message: "Return status updated successfully",
    });
  } catch (error) {
    console.error("Error updating return status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const processRefund = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const { id } = req.params;
    const { refundAmount, refundMethod = "original" } = req.body;

    if (!refundAmount) {
      return res.status(400).json({
        success: false,
        error: "Refund amount is required",
      });
    }

    // Check if return exists and is approved
    const returnRequest = await Return.findById(id);
    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        error: "Return request not found",
      });
    }

    if (returnRequest.status !== "approved") {
      return res.status(400).json({
        success: false,
        error: "Return must be approved before processing refund",
      });
    }

    const result = await Return.processRefund(
      id,
      parseFloat(refundAmount),
      refundMethod,
    );

    res.json({
      success: true,
      message: "Refund processed successfully",
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getReturnStats = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const stats = await Return.getReturnStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching return stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getOrderReturns = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const { orderId } = req.params;
    const userId = req.user.uid;
    const isAdmin = req.dbUser?.role === "admin";

    // If not admin, verify the order belongs to the user
    if (!isAdmin) {
      const db = req.app.locals.db;
      const order = await db.collection("orders").findOne({
        _id: new ObjectId(orderId),
        userId,
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }
    }

    const returns = await Return.findByOrderId(orderId);
    res.json({ success: true, data: returns });
  } catch (error) {
    console.error("Error fetching order returns:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllReturns,
  getUserReturns,
  getReturnById,
  createReturnRequest,
  updateReturnStatus,
  processRefund,
  getReturnStats,
  getOrderReturns,
};


/**
 * Get vendor's returns (for vendor dashboard)
 */
const getVendorReturns = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const { status, page = 1, limit = 20 } = req.query;

    const filter = { page: parseInt(page), limit: parseInt(limit) };
    if (status) filter.status = status;

    const result = await Return.findByVendorId(vendorId, filter);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching vendor returns:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get vendor return statistics
 */
const getVendorReturnStats = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const stats = await Return.getVendorReturnStats(vendorId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching vendor return stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Vendor responds to return request (approve or dispute)
 */
const vendorRespondToReturn = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const { id } = req.params;
    const { action, notes, evidenceImages, disputeReason } = req.body;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    if (!action || !['approved', 'disputed'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Action must be 'approved' or 'disputed'",
      });
    }

    if (action === 'disputed' && !disputeReason) {
      return res.status(400).json({
        success: false,
        error: "Dispute reason is required when disputing a return",
      });
    }

    const result = await Return.vendorRespond(id, vendorId, {
      action,
      notes,
      evidenceImages: evidenceImages || [],
      disputeReason,
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Return not found or already responded",
      });
    }

    res.json({
      success: true,
      message: action === 'approved' 
        ? "Return approved successfully" 
        : "Return disputed. Admin will review your evidence.",
    });
  } catch (error) {
    console.error("Error responding to return:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Get returns pending vendor response
 */
const getPendingVendorResponse = async (req, res) => {
  try {
    const Return = req.app.locals.models.Return;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    const returns = await Return.getPendingVendorResponse(vendorId);

    res.json({
      success: true,
      data: returns,
    });
  } catch (error) {
    console.error("Error fetching pending returns:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllReturns,
  getUserReturns,
  getReturnById,
  createReturnRequest,
  updateReturnStatus,
  processRefund,
  getReturnStats,
  getOrderReturns,
  getVendorReturns,
  getVendorReturnStats,
  vendorRespondToReturn,
  getPendingVendorResponse,
};
