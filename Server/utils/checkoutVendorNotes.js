const MAX_VENDOR_NOTE_LENGTH = 500;

const normalizeVendorNoteKey = (vendorId) => {
  if (!vendorId) return "platform";
  if (typeof vendorId === "object") {
    return vendorId._id?.toString?.() || vendorId.id?.toString?.() || vendorId.toString?.() || "platform";
  }
  return String(vendorId);
};

const sanitizeNote = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_VENDOR_NOTE_LENGTH);

const sanitizeVendorNotes = (vendorNotes = {}) => {
  if (!vendorNotes || typeof vendorNotes !== "object" || Array.isArray(vendorNotes)) {
    return {};
  }

  return Object.entries(vendorNotes).reduce((acc, [vendorId, note]) => {
    const cleanNote = sanitizeNote(note);
    if (cleanNote) {
      acc[normalizeVendorNoteKey(vendorId)] = cleanNote;
    }
    return acc;
  }, {});
};

const getVendorNote = (vendorNotes = {}, vendorId, fallback = "") => {
  const normalizedVendorId = normalizeVendorNoteKey(vendorId);
  return vendorNotes[normalizedVendorId] || vendorNotes.platform || sanitizeNote(fallback);
};

module.exports = {
  MAX_VENDOR_NOTE_LENGTH,
  getVendorNote,
  normalizeVendorNoteKey,
  sanitizeVendorNotes,
};
