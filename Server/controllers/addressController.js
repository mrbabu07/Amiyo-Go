const getUserAddresses = async (req, res) => {
  try {
    const Address = req.app.locals.models.Address;
    const userId = req.user.uid;

    const addresses = await Address.findByUserId(userId);
    res.json({ success: true, data: addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAddressById = async (req, res) => {
  try {
    const Address = req.app.locals.models.Address;
    const { id } = req.params;
    const userId = req.user.uid;

    const address = await Address.findById(id);

    if (!address) {
      return res
        .status(404)
        .json({ success: false, error: "Address not found" });
    }

    // Ensure user can only access their own addresses
    if (address.userId !== userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    res.json({ success: true, data: address });
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDefaultAddress = async (req, res) => {
  try {
    const Address = req.app.locals.models.Address;
    const userId = req.user.uid;

    const address = await Address.getDefaultAddress(userId);

    if (!address) {
      return res
        .status(404)
        .json({ success: false, error: "No default address found" });
    }

    res.json({ success: true, data: address });
  } catch (error) {
    console.error("Error fetching default address:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createAddress = async (req, res) => {
  try {
    const Address = req.app.locals.models.Address;
    const userId = req.user.uid;
    const addressData = {
      ...req.body,
      userId,
    };

    // Validate address data
    const validation = await Address.validateAddress(addressData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // If this is the first address, make it default
    const existingAddresses = await Address.findByUserId(userId);
    if (existingAddresses.length === 0) {
      addressData.isDefault = true;
    }

    const addressId = await Address.create(addressData);

    res.status(201).json({
      success: true,
      data: { id: addressId },
      message: "Address created successfully",
    });
  } catch (error) {
    console.error("Error creating address:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateAddress = async (req, res) => {
  try {
    const Address = req.app.locals.models.Address;
    const { id } = req.params;
    const userId = req.user.uid;
    const updateData = req.body;

    // Check if address exists and belongs to user
    const existingAddress = await Address.findById(id);
    if (!existingAddress) {
      return res
        .status(404)
        .json({ success: false, error: "Address not found" });
    }

    if (existingAddress.userId !== userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    // Validate updated address data
    const addressData = { ...existingAddress, ...updateData };
    const validation = await Address.validateAddress(addressData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const result = await Address.update(id, updateData);

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Address not found" });
    }

    res.json({
      success: true,
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const Address = req.app.locals.models.Address;
    const { id } = req.params;
    const userId = req.user.uid;

    // Check if address exists and belongs to user
    const existingAddress = await Address.findById(id);
    if (!existingAddress) {
      return res
        .status(404)
        .json({ success: false, error: "Address not found" });
    }

    if (existingAddress.userId !== userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const result = await Address.delete(id);

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Address not found" });
    }

    // If deleted address was default, set another address as default
    if (existingAddress.isDefault) {
      const remainingAddresses = await Address.findByUserId(userId);
      if (remainingAddresses.length > 0) {
        await Address.setDefault(remainingAddresses[0]._id, userId);
      }
    }

    res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const Address = req.app.locals.models.Address;
    const { id } = req.params;
    const userId = req.user.uid;

    // Check if address exists and belongs to user
    const existingAddress = await Address.findById(id);
    if (!existingAddress) {
      return res
        .status(404)
        .json({ success: false, error: "Address not found" });
    }

    if (existingAddress.userId !== userId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const result = await Address.setDefault(id, userId);

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Address not found" });
    }

    res.json({
      success: true,
      message: "Default address updated successfully",
    });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getUserAddresses,
  getAddressById,
  getDefaultAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
