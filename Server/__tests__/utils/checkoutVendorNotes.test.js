const {
  MAX_VENDOR_NOTE_LENGTH,
  getVendorNote,
  normalizeVendorNoteKey,
  sanitizeVendorNotes,
} = require("../../utils/checkoutVendorNotes");

describe("checkoutVendorNotes utility", () => {
  it("normalizes vendor ids from strings, objects, and missing values", () => {
    expect(normalizeVendorNoteKey("vendor-1")).toBe("vendor-1");
    expect(normalizeVendorNoteKey({ _id: "vendor-2" })).toBe("vendor-2");
    expect(normalizeVendorNoteKey(null)).toBe("platform");
  });

  it("sanitizes note text and drops empty notes", () => {
    const notes = sanitizeVendorNotes({
      "vendor-1": "  Call   before delivery  ",
      "vendor-2": "",
      platform: " Leave at reception ",
    });

    expect(notes).toEqual({
      "vendor-1": "Call before delivery",
      platform: "Leave at reception",
    });
  });

  it("caps seller notes to the supported note length", () => {
    const longNote = "a".repeat(MAX_VENDOR_NOTE_LENGTH + 20);
    const notes = sanitizeVendorNotes({ "vendor-1": longNote });

    expect(notes["vendor-1"]).toHaveLength(MAX_VENDOR_NOTE_LENGTH);
  });

  it("returns the vendor note, then platform fallback, then explicit fallback", () => {
    const notes = sanitizeVendorNotes({
      "vendor-1": "Pack separately",
      platform: "Call first",
    });

    expect(getVendorNote(notes, "vendor-1", "fallback")).toBe("Pack separately");
    expect(getVendorNote(notes, "vendor-2", "fallback")).toBe("Call first");
    expect(getVendorNote({}, "vendor-2", "fallback")).toBe("fallback");
  });
});
