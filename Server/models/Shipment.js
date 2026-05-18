const { ObjectId } = require("mongodb");
const {
  COD_STATES,
  FORWARD_STATES,
  REVERSE_STATES,
  canTransition,
  findTransitionPath,
  stateLabel,
} = require("../utils/logisticsStateMachine");

const normalizeId = (value) => (value?.toString ? value.toString() : String(value || ""));
const toObjectId = (value) => (ObjectId.isValid(normalizeId(value)) ? new ObjectId(normalizeId(value)) : null);
const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const idQuery = (id) => {
  const objectId = toObjectId(id);
  return objectId ? { _id: objectId } : { _id: id };
};

const idValues = (id) => {
  const values = [normalizeId(id)].filter(Boolean);
  const objectId = toObjectId(id);
  if (objectId) values.push(objectId);
  return values;
};

const isCodPayment = (method = "") =>
  ["cod", "cash_on_delivery", "cash on delivery"].includes(String(method || "").toLowerCase());

const buildAddressText = (address = {}) => [
  address.name,
  address.phone,
  address.address,
  address.area,
  address.union,
  address.upazila,
  address.district || address.city,
  address.division,
  address.zipCode || address.postalCode,
].filter(Boolean).join(", ");

const getVendorItems = (order = {}, vendorId) => {
  const vendorKeys = new Set(idValues(vendorId).map(normalizeId));
  return (order.products || []).filter((item) => vendorKeys.has(normalizeId(item.vendorId)));
};

const shipmentNumber = (prefix, seed = "") => {
  const suffix = normalizeId(seed).slice(-8).toUpperCase() || Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${suffix}`;
};

class Shipment {
  constructor(db) {
    this.collection = db.collection("shipments");
    this.eventsCollection = db.collection("shipment_events");
    this.manifestsCollection = db.collection("manifests");
    this.couriersCollection = db.collection("couriers");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex?.({ orderId: 1, vendorId: 1, shipmentType: 1 });
      await this.collection.createIndex?.({ trackingNumber: 1 }, { sparse: true });
      await this.collection.createIndex?.({ shipmentState: 1 });
      await this.collection.createIndex?.({ codState: 1 });
      await this.collection.createIndex?.({ reverseState: 1 });
      await this.collection.createIndex?.({ manifestId: 1 });
      await this.eventsCollection.createIndex?.({ shipmentId: 1, timestamp: 1 });
      await this.manifestsCollection.createIndex?.({ vendorId: 1, status: 1 });
      await this.couriersCollection.createIndex?.({ code: 1 }, { unique: true, sparse: true });
    } catch (error) {
      console.error("Error creating Shipment indexes:", error);
    }
  }

  getStateMachine() {
    return {
      forward: { states: FORWARD_STATES },
      reverse: { states: REVERSE_STATES },
      cod: { states: COD_STATES },
    };
  }

  buildEvent({ type, state, actorRole = "system", actorId = null, description = "", metadata = {} }) {
    return {
      _id: new ObjectId(),
      eventType: type || state,
      eventDescription: description || stateLabel(state),
      actor: actorRole,
      actorId: actorId ? normalizeId(actorId) : null,
      timestamp: new Date(),
      metadata,
    };
  }

  async appendEvent(shipmentId, event) {
    await this.eventsCollection.insertOne?.({
      ...event,
      shipmentId: normalizeId(shipmentId),
      createdAt: event.timestamp || new Date(),
    });
  }

  async findById(id) {
    return this.collection.findOne(idQuery(id));
  }

  async findByOrderVendor(orderId, vendorId, shipmentType = "forward") {
    return this.collection.findOne({
      orderId: normalizeId(orderId),
      vendorId: { $in: idValues(vendorId) },
      shipmentType,
    });
  }

  async list(filter = {}) {
    const query = {};
    if (filter.vendorId) query.vendorId = { $in: idValues(filter.vendorId) };
    if (filter.orderId) query.orderId = normalizeId(filter.orderId);
    if (filter.shipmentState && filter.shipmentState !== "all") query.shipmentState = filter.shipmentState;
    if (filter.codState && filter.codState !== "all") query.codState = filter.codState;
    if (filter.reverseState && filter.reverseState !== "all") query.reverseState = filter.reverseState;
    if (filter.shipmentType) query.shipmentType = filter.shipmentType;
    return this.collection.find(query).sort({ createdAt: -1 }).toArray();
  }

  async createFromOrder(order, vendorId, data = {}) {
    const existing = await this.findByOrderVendor(order._id || order.orderId, vendorId, "forward");
    if (existing) return existing;

    const vendorItems = getVendorItems(order, vendorId);
    if (vendorItems.length === 0) {
      throw new Error("No vendor items found for shipment");
    }

    const cod = isCodPayment(order.paymentMethod);
    const codAmount = cod
      ? vendorItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
      : 0;
    const now = new Date();
    const trackingNumber = data.trackingNumber || shipmentNumber("AMG", order._id || order.orderId);
    const event = this.buildEvent({
      state: "created",
      type: "shipment.created",
      actorRole: data.actorRole || "system",
      actorId: data.actorId || null,
      description: "Shipment created",
      metadata: { orderId: normalizeId(order._id || order.orderId), vendorId: normalizeId(vendorId) },
    });
    const doc = {
      orderId: normalizeId(order._id || order.orderId),
      userId: normalizeId(order.userId),
      vendorId: normalizeId(vendorId),
      courierId: data.courierId || null,
      courierCode: data.courierCode || null,
      courierName: data.courierName || null,
      trackingNumber,
      waybillNumber: data.waybillNumber || null,
      shipmentType: "forward",
      shipmentState: data.shipmentState || "created",
      codState: cod ? "cod_pending" : null,
      reverseState: null,
      pickupAddress: data.pickupAddress || data.vendorAddress || {},
      deliveryAddress: order.shippingInfo || order.deliveryAddress || {},
      pickupAddressText: buildAddressText(data.pickupAddress || data.vendorAddress || {}),
      deliveryAddressText: buildAddressText(order.shippingInfo || order.deliveryAddress || {}),
      weight: Number(data.weight || 0),
      dimensions: data.dimensions || null,
      itemCount: vendorItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
      items: vendorItems.map((item) => ({
        productId: normalizeId(item.productId || item._id),
        title: item.title || item.name || item.productName || "Product",
        sku: item.sku || item.variantSku || "",
        quantity: Number(item.quantity || 1),
      })),
      codAmount: round2(codAmount),
      labelUrl: null,
      packingSlipUrl: null,
      manifestId: null,
      estimatedDeliveryDate: data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate) : null,
      deliveryAttempts: [],
      events: [event],
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(doc);
    await this.appendEvent(result.insertedId, event);
    return { ...doc, _id: result.insertedId };
  }

  async transition(id, field, targetState, options = {}) {
    const shipment = await this.findById(id);
    if (!shipment) throw new Error("Shipment not found");

    const currentState = shipment[field];
    if (!canTransition(field, currentState, targetState)) {
      throw new Error(`Invalid ${field} transition: ${currentState || "none"} -> ${targetState}`);
    }

    const event = this.buildEvent({
      state: targetState,
      type: options.type || `${field}.${targetState}`,
      actorRole: options.actorRole || "system",
      actorId: options.actorId || null,
      description: options.description || stateLabel(targetState),
      metadata: options.metadata || {},
    });
    const now = new Date();
    const set = {
      [field]: targetState,
      updatedAt: now,
      ...this.stateTimestamp(field, targetState, now),
      ...(options.set || {}),
    };

    await this.collection.updateOne(idQuery(id), {
      $set: set,
      $push: { events: event },
    });
    await this.appendEvent(id, event);
    return this.findById(id);
  }

  stateTimestamp(field, state, now) {
    if (field === "shipmentState") {
      return {
        ...(state === "packed" ? { packedAt: now } : {}),
        ...(state === "pickup_ready" ? { pickupReadyAt: now } : {}),
        ...(state === "pickup_scheduled" ? { pickupScheduledAt: now } : {}),
        ...(state === "picked_up" ? { pickedUpAt: now } : {}),
        ...(state === "in_transit" ? { inTransitAt: now } : {}),
        ...(state === "out_for_delivery" ? { outForDeliveryAt: now } : {}),
        ...(state === "delivered" ? { deliveredAt: now } : {}),
        ...(state === "delivery_failed" ? { lastDeliveryFailedAt: now } : {}),
        ...(state === "return_to_origin" ? { returnToOriginAt: now } : {}),
      };
    }
    if (field === "reverseState") {
      return {
        ...(state === "return_pickup_scheduled" ? { returnPickupScheduledAt: now } : {}),
        ...(state === "return_picked_up" ? { returnPickedUpAt: now } : {}),
        ...(state === "return_received" ? { returnReceivedAt: now } : {}),
        ...(state === "inspected" ? { inspectedAt: now } : {}),
        ...(["restocked", "disposed", "refurbished"].includes(state) ? { reverseCompletedAt: now } : {}),
      };
    }
    if (field === "codState") {
      return {
        ...(state === "cod_collected" ? { codCollectedAt: now } : {}),
        ...(state === "cod_remitted" ? { codRemittedAt: now } : {}),
        ...(state === "cod_settled" ? { codSettledAt: now } : {}),
        ...(state === "cod_failed" ? { codFailedAt: now } : {}),
      };
    }
    return {};
  }

  async advanceForward(id, targetState, options = {}) {
    const shipment = await this.findById(id);
    if (!shipment) throw new Error("Shipment not found");
    const path = findTransitionPath("shipmentState", shipment.shipmentState, targetState);
    if (path.length === 0) {
      throw new Error(`Invalid shipmentState transition: ${shipment.shipmentState} -> ${targetState}`);
    }

    let current = shipment;
    for (const state of path.slice(1)) {
      current = await this.transition(current._id, "shipmentState", state, options);
    }
    return current;
  }

  async markPacked(id, data = {}, actor = {}) {
    const shipment = await this.findById(id);
    if (!shipment) throw new Error("Shipment not found");
    if (shipment.shipmentState === "created") {
      await this.transition(id, "shipmentState", "pending_packing", {
        actorRole: actor.role || "vendor",
        actorId: actor.id,
        type: "shipment.pending_packing",
        description: "Packing started",
        metadata: { checklist: data.checklist || [] },
      });
    }
    return this.transition(id, "shipmentState", "packed", {
      actorRole: actor.role || "vendor",
      actorId: actor.id,
      type: "shipment.packed",
      description: "Shipment packed",
      metadata: { checklist: data.checklist || [], packingNotes: data.packingNotes || "" },
      set: {
        weight: Number(data.weight || 0),
        dimensions: data.dimensions || null,
        packingNotes: data.packingNotes || "",
        packingSlipUrl: `/api/vendor/logistics/shipments/${normalizeId(id)}/packing-slip`,
      },
    });
  }

  async assignCourier(id, data = {}, actor = {}) {
    const set = {
      courierId: data.courierId || null,
      courierCode: data.courierCode || data.courier_code || null,
      courierName: data.courierName || data.name || "Manual courier",
      trackingNumber: data.trackingNumber || shipmentNumber(data.courierCode || "TRK", id),
      estimatedDeliveryDate: data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate) : null,
    };
    await this.collection.updateOne(idQuery(id), { $set: { ...set, updatedAt: new Date() } });
    return this.advanceForward(id, "in_transit", {
      actorRole: actor.role || "admin",
      actorId: actor.id,
      type: "shipment.in_transit",
      description: "Courier assigned and shipment moved in transit",
      metadata: set,
    });
  }

  async generateLabel(id, actor = {}) {
    const labelUrl = `/api/shipments/${normalizeId(id)}/label`;
    const event = this.buildEvent({
      state: "label_generated",
      type: "shipment.label_generated",
      actorRole: actor.role || "system",
      actorId: actor.id,
      description: "Shipping label generated",
      metadata: { labelUrl },
    });
    await this.collection.updateOne(idQuery(id), {
      $set: { labelUrl, updatedAt: new Date() },
      $push: { events: event },
    });
    await this.appendEvent(id, event);
    return this.findById(id);
  }

  async createManifest({ vendorId, shipmentIds = [], courierId = null, courierName = "", pickupDate = null, notes = "" }, actor = {}) {
    const normalizedIds = shipmentIds.map(normalizeId).filter(Boolean);
    if (normalizedIds.length === 0) throw new Error("At least one shipment is required");

    const shipments = await this.collection
      .find({ _id: { $in: normalizedIds.map((id) => toObjectId(id) || id) }, vendorId: { $in: idValues(vendorId) } })
      .toArray();
    if (shipments.length === 0) throw new Error("No matching shipments found");

    const now = new Date();
    const manifest = {
      manifestNumber: shipmentNumber("MAN", vendorId),
      vendorId: normalizeId(vendorId),
      courierId: courierId || null,
      courierName: courierName || shipments[0]?.courierName || "Platform courier",
      date: pickupDate ? new Date(pickupDate) : now,
      shipmentIds: shipments.map((item) => normalizeId(item._id)),
      shipments: shipments.map((item) => ({
        shipmentId: normalizeId(item._id),
        orderId: item.orderId,
        trackingNumber: item.trackingNumber,
        codAmount: item.codAmount || 0,
      })),
      status: "open",
      notes,
      createdBy: actor.id || null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.manifestsCollection.insertOne(manifest);
    const saved = { ...manifest, _id: result.insertedId };

    for (const shipment of shipments) {
      await this.collection.updateOne(idQuery(shipment._id), {
        $set: { manifestId: normalizeId(result.insertedId), updatedAt: now },
      });
    }

    return saved;
  }

  async submitManifest(id, actor = {}) {
    const manifest = await this.manifestsCollection.findOne(idQuery(id));
    if (!manifest) throw new Error("Manifest not found");

    const now = new Date();
    await this.manifestsCollection.updateOne(idQuery(id), {
      $set: { status: "submitted", submittedAt: now, submittedBy: actor.id || null, updatedAt: now },
    });
    for (const shipmentId of manifest.shipmentIds || []) {
      const shipment = await this.findById(shipmentId);
      if (shipment && ["packed", "pickup_ready"].includes(shipment.shipmentState)) {
        await this.advanceForward(shipmentId, "pickup_scheduled", {
          actorRole: actor.role || "vendor",
          actorId: actor.id,
          type: "manifest.submitted",
          description: "Manifest submitted to courier",
          metadata: { manifestId: normalizeId(id) },
        });
      }
    }
    return this.manifestsCollection.findOne(idQuery(id));
  }

  async confirmManifestPickup(id, actor = {}) {
    const manifest = await this.manifestsCollection.findOne(idQuery(id));
    if (!manifest) throw new Error("Manifest not found");

    const now = new Date();
    await this.manifestsCollection.updateOne(idQuery(id), {
      $set: { status: "picked_up", pickedUpAt: now, confirmedBy: actor.id || null, updatedAt: now },
    });
    for (const shipmentId of manifest.shipmentIds || []) {
      const shipment = await this.findById(shipmentId);
      if (shipment && shipment.shipmentState !== "picked_up") {
        await this.advanceForward(shipmentId, "picked_up", {
          actorRole: actor.role || "admin",
          actorId: actor.id,
          type: "shipment.picked_up",
          description: "Courier pickup confirmed",
          metadata: { manifestId: normalizeId(id) },
        });
      }
    }
    return this.manifestsCollection.findOne(idQuery(id));
  }

  async recordDeliveryAttempt(id, data = {}, actor = {}) {
    const shipment = await this.findById(id);
    if (!shipment) throw new Error("Shipment not found");
    const attempts = [...(shipment.deliveryAttempts || []), {
      attemptedAt: new Date(),
      outcome: data.outcome || "failed",
      reason: data.reason || "",
      receiverName: data.receiverName || "",
      proofUrl: data.proofUrl || "",
      notes: data.notes || "",
    }];
    await this.collection.updateOne(idQuery(id), { $set: { deliveryAttempts: attempts, updatedAt: new Date() } });

    if (data.outcome === "delivered") {
      const delivered = await this.advanceForward(id, "delivered", {
        actorRole: actor.role || "admin",
        actorId: actor.id,
        type: "shipment.delivered",
        description: "Delivery confirmed",
        metadata: data,
      });
      if (delivered.codState === "cod_pending" && data.codCollected !== false) {
        return this.transition(id, "codState", "cod_collected", {
          actorRole: actor.role || "admin",
          actorId: actor.id,
          type: "cod.collected",
          description: "COD collected at delivery",
          metadata: { amount: delivered.codAmount || 0 },
        });
      }
      return delivered;
    }

    const shouldRto = attempts.length >= Number(data.maxAttempts || 3) || data.outcome === "rto";
    if (shouldRto) return this.markRto(id, { reason: data.reason || "Maximum delivery attempts reached" }, actor);
    return this.transition(id, "shipmentState", "delivery_failed", {
      actorRole: actor.role || "admin",
      actorId: actor.id,
      type: "shipment.delivery_failed",
      description: data.reason || "Delivery attempt failed",
      metadata: { attempts: attempts.length, ...data },
    });
  }

  async updateCodState(id, targetState, data = {}, actor = {}) {
    const set = {
      codRemittanceReference: data.remittanceReference || data.transactionId || null,
    };
    if (targetState === "cod_disputed") set.codDisputeReason = data.reason || "";

    return this.transition(id, "codState", targetState, {
      actorRole: actor.role || "admin",
      actorId: actor.id,
      type: `cod.${targetState.replace("cod_", "")}`,
      description: data.description || stateLabel(targetState),
      metadata: data,
      set,
    });
  }

  async markRto(id, data = {}, actor = {}) {
    const shipment = await this.advanceForward(id, "return_to_origin", {
      actorRole: actor.role || "admin",
      actorId: actor.id,
      type: "shipment.return_to_origin",
      description: data.reason || "Shipment returned to origin",
      metadata: data,
    });
    if (shipment.codState === "cod_pending") {
      return this.updateCodState(id, "cod_failed", { reason: data.reason || "RTO before COD collection" }, actor);
    }
    return shipment;
  }

  async confirmRtoReceived(id, data = {}, actor = {}) {
    const event = this.buildEvent({
      state: "rto_received",
      type: "shipment.rto_received",
      actorRole: actor.role || "vendor",
      actorId: actor.id,
      description: data.notes || "RTO parcel received by vendor",
      metadata: data,
    });
    await this.collection.updateOne(idQuery(id), {
      $set: {
        rtoReceivedAt: new Date(),
        rtoReceivedBy: actor.id || null,
        stockAdjustment: data.stockAdjustment || "review_required",
        updatedAt: new Date(),
      },
      $push: { events: event },
    });
    await this.appendEvent(id, event);
    return this.findById(id);
  }

  async ensureReverseForReturn(returnDoc, data = {}, actor = {}) {
    const existing = await this.collection.findOne({ returnId: normalizeId(returnDoc._id || returnDoc.returnId), shipmentType: "reverse" });
    if (existing) return existing;

    const now = new Date();
    const trackingNumber = data.trackingNumber || shipmentNumber("RET", returnDoc._id || returnDoc.returnId);
    const event = this.buildEvent({
      state: "return_requested",
      type: "reverse.return_requested",
      actorRole: actor.role || "system",
      actorId: actor.id,
      description: "Reverse shipment created for customer return",
      metadata: { returnId: normalizeId(returnDoc._id || returnDoc.returnId) },
    });
    const doc = {
      orderId: normalizeId(returnDoc.orderId),
      returnId: normalizeId(returnDoc._id || returnDoc.returnId),
      userId: normalizeId(returnDoc.userId),
      vendorId: normalizeId(returnDoc.vendorId),
      shipmentType: "reverse",
      shipmentState: "delivered",
      codState: null,
      reverseState: data.reverseState || "return_requested",
      trackingNumber,
      waybillNumber: data.waybillNumber || null,
      courierId: data.courierId || null,
      courierCode: data.courierCode || null,
      courierName: data.courierName || null,
      pickupAddress: data.pickupAddress || returnDoc.pickupAddress || {},
      deliveryAddress: data.destinationAddress || returnDoc.vendorAddress || {},
      reasonCode: returnDoc.reason || data.reasonCode || "",
      itemCount: Number(returnDoc.quantity || 1),
      labelUrl: null,
      events: [event],
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(doc);
    await this.appendEvent(result.insertedId, event);
    return { ...doc, _id: result.insertedId };
  }

  async updateReverseStateByReturn(returnId, targetState, data = {}, actor = {}) {
    const shipment = await this.collection.findOne({ returnId: normalizeId(returnId), shipmentType: "reverse" });
    if (!shipment) throw new Error("Reverse shipment not found");

    const path = findTransitionPath("reverseState", shipment.reverseState, targetState);
    if (path.length === 0) {
      throw new Error(`Invalid reverseState transition: ${shipment.reverseState} -> ${targetState}`);
    }

    let current = shipment;
    for (const state of path.slice(1)) {
      current = await this.transition(current._id, "reverseState", state, {
        actorRole: actor.role || "admin",
        actorId: actor.id,
        type: `reverse.${state}`,
        description: data.description || stateLabel(state),
        metadata: data,
        set: state === targetState ? {
          inspectionResult: data.inspectionResult || null,
          restockQuantity: data.restockQuantity || 0,
          reverseDecision: ["restocked", "disposed", "refurbished"].includes(state) ? state : null,
        } : {},
      });
    }
    return current;
  }
}

module.exports = Shipment;
