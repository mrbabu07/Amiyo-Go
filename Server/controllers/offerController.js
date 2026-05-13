const Offer = require("../models/Offer");
const fs = require("fs");
const path = require("path");

const OFFER_CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

const validateOfferPayload = (payload, { requireImage = false } = {}) => {
  const errors = [];
  const discountValue = Number(payload.discountValue);
  const priority = Number(payload.priority ?? 0);
  const startDate = payload.startDate ? new Date(payload.startDate) : null;
  const endDate = payload.endDate ? new Date(payload.endDate) : null;
  const couponCode = payload.couponCode ? String(payload.couponCode).trim().toUpperCase() : "";
  const buttonLink = payload.buttonLink ? String(payload.buttonLink).trim() : "/products";

  if (!String(payload.title || "").trim()) errors.push("Offer title is required.");
  if (!String(payload.description || "").trim()) errors.push("Offer description is required.");
  if (!["percentage", "fixed"].includes(payload.discountType)) errors.push('Discount type must be either "percentage" or "fixed".');
  if (Number.isNaN(discountValue) || discountValue <= 0) errors.push("Discount value must be greater than zero.");
  if (payload.discountType === "percentage" && !Number.isNaN(discountValue) && discountValue > 100) {
    errors.push("Percentage discount cannot be more than 100.");
  }
  if (!startDate || Number.isNaN(startDate.getTime())) errors.push("A valid start date is required.");
  if (!endDate || Number.isNaN(endDate.getTime())) errors.push("A valid end date is required.");
  if (startDate && endDate && startDate >= endDate) errors.push("End date must be after start date.");
  if (Number.isNaN(priority) || priority < 0) errors.push("Priority must be zero or more.");
  if (couponCode && !OFFER_CODE_PATTERN.test(couponCode)) {
    errors.push("Coupon code must be 3-30 characters and use only letters, numbers, dash, or underscore.");
  }
  if (!buttonLink.startsWith("/")) errors.push("Button link must start with /.");
  if (requireImage && !payload.image) errors.push("Offer image is required.");

  return {
    errors,
    normalized: {
      ...payload,
      title: String(payload.title || "").trim(),
      description: String(payload.description || "").trim(),
      discountValue,
      priority,
      startDate,
      endDate,
      couponCode,
      buttonText: String(payload.buttonText || "Shop Now").trim() || "Shop Now",
      buttonLink,
    },
  };
};

// Get all offers (Admin)
exports.getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ priority: -1, createdAt: -1 });

    // Note: targetProducts population skipped because Product model uses native MongoDB driver
    // If you need product details, fetch them separately

    res.json({ success: true, data: offers });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get active popup offer (Public)
exports.getActivePopupOffer = async (req, res) => {
  try {
    const offers = await Offer.getActivePopupOffers();
    const offer = offers.length > 0 ? offers[0] : null;
    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get offer by ID
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }

    res.json({ success: true, data: offer });
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create offer (Admin)
exports.createOffer = async (req, res) => {
  try {
    const offerData = {
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    };

    // Parse targetProducts if it's a string
    if (typeof offerData.targetProducts === "string") {
      offerData.targetProducts = JSON.parse(offerData.targetProducts);
    }

    const { errors, normalized } = validateOfferPayload(offerData, {
      requireImage: true,
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
      });
    }

    const offer = await Offer.create(normalized);
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    // Delete uploaded file if offer creation fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Update offer (Admin)
exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }

    const updateData = { ...req.body };

    // Handle new image upload
    if (req.file) {
      // Delete old image
      if (offer.image) {
        const oldImagePath = path.join(__dirname, "..", offer.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = `/uploads/${req.file.filename}`;
    }

    // Parse targetProducts if it's a string
    if (typeof updateData.targetProducts === "string") {
      updateData.targetProducts = JSON.parse(updateData.targetProducts);
    }

    const { errors, normalized } = validateOfferPayload(
      {
        ...offer.toObject(),
        ...updateData,
        image: updateData.image || offer.image,
      },
      { requireImage: true },
    );

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
      });
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        ...normalized,
      },
      { new: true, runValidators: true },
    );

    res.json({ success: true, data: updatedOffer });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete offer (Admin)
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }

    // Delete image file
    if (offer.image) {
      const imagePath = path.join(__dirname, "..", offer.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Offer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Toggle offer active status (Admin)
exports.toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
