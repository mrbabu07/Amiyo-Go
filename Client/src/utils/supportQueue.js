export const supportStatuses = [
  { value: "open", label: "Open", tone: "danger" },
  { value: "in_progress", label: "In Progress", tone: "warning" },
  { value: "resolved", label: "Resolved", tone: "success" },
  { value: "closed", label: "Closed", tone: "neutral" },
];

export const supportPriorities = [
  { value: "urgent", label: "Urgent", slaHours: 4, tone: "danger" },
  { value: "high", label: "High", slaHours: 8, tone: "warning" },
  { value: "medium", label: "Medium", slaHours: 24, tone: "info" },
  { value: "low", label: "Low", slaHours: 48, tone: "neutral" },
];

export function formatSupportLabel(value = "") {
  return String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getSupportStatusMeta(status = "open") {
  const normalized = String(status || "open").toLowerCase();
  return (
    supportStatuses.find((item) => item.value === normalized) || {
      value: normalized,
      label: formatSupportLabel(normalized),
      tone: "neutral",
    }
  );
}

export function getSupportPriorityMeta(priority = "medium") {
  const normalized = String(priority || "medium").toLowerCase();
  return (
    supportPriorities.find((item) => item.value === normalized) || {
      value: normalized,
      label: formatSupportLabel(normalized),
      slaHours: 24,
      tone: "neutral",
    }
  );
}

export function getTicketLastActivity(ticket = {}) {
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const latestMessageAt = messages
    .map((message) => new Date(message.timestamp || message.createdAt || 0).getTime())
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => b - a)[0];

  const fallbackAt = new Date(ticket.lastReplyAt || ticket.updatedAt || ticket.createdAt || 0).getTime();
  const fallback = Number.isNaN(fallbackAt) ? 0 : fallbackAt;

  return new Date(Math.max(latestMessageAt || 0, fallback));
}

export function getTicketSlaState(ticket = {}, now = new Date()) {
  const status = String(ticket.status || "open").toLowerCase();
  const priorityMeta = getSupportPriorityMeta(ticket.priority);

  if (["resolved", "closed"].includes(status)) {
    return {
      state: "complete",
      label: "Complete",
      remainingMinutes: 0,
      overdue: false,
    };
  }

  const lastActivity = getTicketLastActivity(ticket);
  const dueAt = new Date(lastActivity.getTime() + priorityMeta.slaHours * 60 * 60 * 1000);
  const remainingMinutes = Math.round((dueAt.getTime() - now.getTime()) / 60000);
  const overdue = remainingMinutes < 0;

  if (overdue) {
    return {
      state: "breached",
      label: `${Math.abs(Math.floor(remainingMinutes / 60))}h overdue`,
      remainingMinutes,
      overdue,
    };
  }

  if (remainingMinutes <= 120) {
    return {
      state: "at_risk",
      label: `${Math.max(1, Math.ceil(remainingMinutes / 60))}h left`,
      remainingMinutes,
      overdue,
    };
  }

  return {
    state: "healthy",
    label: `${Math.ceil(remainingMinutes / 60)}h left`,
    remainingMinutes,
    overdue,
  };
}

export function getSupportStats(tickets = [], now = new Date()) {
  const counts = {
    total: tickets.length,
    open: 0,
    inProgress: 0,
    urgent: 0,
    unassigned: 0,
    slaRisk: 0,
  };

  tickets.forEach((ticket) => {
    const status = String(ticket.status || "open").toLowerCase();
    const priority = String(ticket.priority || "medium").toLowerCase();
    const sla = getTicketSlaState(ticket, now);

    if (status === "open") counts.open += 1;
    if (status === "in_progress") counts.inProgress += 1;
    if (priority === "urgent") counts.urgent += 1;
    if (!ticket.assignedTo) counts.unassigned += 1;
    if (["breached", "at_risk"].includes(sla.state)) counts.slaRisk += 1;
  });

  return counts;
}

export function filterSupportTickets(tickets = [], filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const status = String(filters.status || "").toLowerCase();
  const priority = String(filters.priority || "").toLowerCase();
  const assignedTo = String(filters.assignedTo || "");

  return tickets.filter((ticket) => {
    if (status && String(ticket.status || "").toLowerCase() !== status) return false;
    if (priority && String(ticket.priority || "").toLowerCase() !== priority) return false;
    if (assignedTo && String(ticket.assignedTo || "") !== assignedTo) return false;

    if (!search) return true;

    const searchable = [
      ticket.ticketId,
      ticket.subject,
      ticket.description,
      ticket.customerInfo?.name,
      ticket.customerInfo?.email,
      ticket.orderId,
      ticket.vendorId,
      ticket.productId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(search);
  });
}
