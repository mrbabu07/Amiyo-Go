const toStringId = (value) => value?.toString?.() || String(value || "");

const normalizePermissions = (permissions = []) =>
  [...new Set((Array.isArray(permissions) ? permissions : []).map((permission) => String(permission).trim()).filter(Boolean))].sort();

const permissionDiff = (before = [], after = []) => {
  const previous = new Set(normalizePermissions(before));
  const next = new Set(normalizePermissions(after));

  return {
    added: [...next].filter((permission) => !previous.has(permission)),
    removed: [...previous].filter((permission) => !next.has(permission)),
  };
};

const valueChanged = (before, after) => String(before || "") !== String(after || "");

const buildVendorStaffAuditEntry = ({
  vendorId,
  actorId,
  action,
  before = null,
  after = null,
  metadata = {},
}) => {
  const permissionChanges = permissionDiff(before?.permissions, after?.permissions);
  const changes = {
    ...(valueChanged(before?.name, after?.name) ? { name: { from: before?.name || "", to: after?.name || "" } } : {}),
    ...(valueChanged(before?.status, after?.status) ? { status: { from: before?.status || "", to: after?.status || "" } } : {}),
    ...(permissionChanges.added.length || permissionChanges.removed.length ? { permissions: permissionChanges } : {}),
  };

  return {
    vendorId: toStringId(vendorId),
    staffId: toStringId(after?._id || before?._id || metadata.staffId),
    staffEmail: String(after?.email || before?.email || metadata.email || "").toLowerCase(),
    staffName: after?.name || before?.name || "",
    action,
    actorId: actorId || null,
    actorRole: "vendor_owner",
    changes,
    metadata,
    createdAt: new Date(),
  };
};

const summarizeStaffAuditEntry = (entry = {}) => {
  const changes = entry.changes || {};
  const parts = [];

  if (changes.status) {
    parts.push(`Status ${changes.status.from || "blank"} to ${changes.status.to || "blank"}`);
  }
  if (changes.name) {
    parts.push("Name updated");
  }
  if (changes.permissions?.added?.length) {
    parts.push(`${changes.permissions.added.length} permission added`);
  }
  if (changes.permissions?.removed?.length) {
    parts.push(`${changes.permissions.removed.length} permission removed`);
  }

  return parts.join(", ") || "No visible field changes";
};

module.exports = {
  buildVendorStaffAuditEntry,
  normalizePermissions,
  permissionDiff,
  summarizeStaffAuditEntry,
};
