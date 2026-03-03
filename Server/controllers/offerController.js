const Offer = require("../models/Offer");
const fs = require("fs");
const path = require("path");

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

    // Validate dates
    if (new Date(offerData.startDate) >= new Date(offerData.endDate)) {
      return res.status(400).json({
        success: false,
        error: "End date must be after start date",
      });
    }

    const offer = await Offer.create(offerData);
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

    // Validate dates
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
        return res.status(400).json({
          success: false,
          error: "End date must be after start date",
        });
      }
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      updateData,
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
