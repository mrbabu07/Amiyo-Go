const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/auth");
const { upload, validateUploadedFileSize } = require("../middleware/upload");
const uploadService = require("../services/upload/uploadService");

const router = express.Router();

router.post("/image", verifyToken, upload.single("image"), validateUploadedFileSize, async (req, res) => {
  try {
    const data = await uploadService.uploadImage(req.file, req.body.folder || "images", req);
    res.json({ success: true, data, url: data.url });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/images", verifyToken, upload.array("images", 10), validateUploadedFileSize, async (req, res) => {
  try {
    const files = await Promise.all((req.files || []).map((file) => uploadService.uploadImage(file, req.body.folder || "images", req)));
    res.json({ success: true, data: files, urls: files.map((file) => file.url) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/document", verifyToken, upload.single("document"), validateUploadedFileSize, async (req, res) => {
  try {
    const data = await uploadService.uploadDocument(req.file, req.body.folder || "documents", req);
    res.json({ success: true, data, url: data.url });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/video", verifyToken, upload.single("video"), validateUploadedFileSize, async (req, res) => {
  try {
    const data = await uploadService.uploadVideo(req.file, req.body.folder || "videos", req);
    res.json({ success: true, data, url: data.url });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:publicId", verifyToken, async (req, res) => {
  try {
    const data = await uploadService.deleteFile(decodeURIComponent(req.params.publicId), req.body?.provider || req.query.provider || "local");
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/signed/:publicId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const url = uploadService.getFileUrl(decodeURIComponent(req.params.publicId));
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
