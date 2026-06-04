const express = require("express");

const router = express.Router();

router.get("/:placement", async (req, res) => {
  try {
    const banners = await req.app.locals.models.Banner.findPublicByPlacement(req.params.placement);
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
