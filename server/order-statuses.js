export const FULFILLMENT_STATUSES = Object.freeze([
  {
    id: "ORDER_CONFIRMED",
    label: "Order confirmed",
    publicTitle: "Order confirmed",
    publicDescription: "Your order has been confirmed.",
  },
  {
    id: "ORDER_ACCEPTED",
    label: "Order accepted",
    publicTitle: "Order accepted",
    publicDescription: "Orbmare has accepted your order and begun processing it.",
  },
  {
    id: "PURCHASED",
    label: "Purchased",
    publicTitle: "Piece secured",
    publicDescription: "Your selected piece has been secured.",
  },
  {
    id: "SELLER_CONFIRMED",
    label: "Source confirmed",
    publicTitle: "Source confirmed",
    publicDescription: "The source has confirmed your order.",
  },
  {
    id: "PREPARING_SHIPMENT",
    label: "Preparing shipment",
    publicTitle: "Preparing shipment",
    publicDescription: "Your order is being carefully prepared for dispatch.",
  },
  {
    id: "SHIPPED",
    label: "Shipped",
    publicTitle: "Dispatched",
    publicDescription: "Your order has been dispatched.",
  },
  {
    id: "IN_TRANSIT",
    label: "In transit",
    publicTitle: "In transit",
    publicDescription: "Your order is currently in transit.",
  },
  {
    id: "CUSTOMS_CLEARANCE",
    label: "Customs clearance",
    publicTitle: "Customs clearance",
    publicDescription: "Your order is completing customs processing.",
  },
  {
    id: "LOCAL_DELIVERY",
    label: "Local delivery",
    publicTitle: "Local delivery",
    publicDescription: "Your order has been transferred to the local delivery network.",
  },
  {
    id: "DELIVERED",
    label: "Delivered",
    publicTitle: "Delivered",
    publicDescription: "Your order has been delivered.",
  },
  {
    id: "DELAYED",
    label: "Delayed",
    publicTitle: "Delayed",
    publicDescription: "Your order is taking longer than expected. We are following its progress closely.",
  },
  {
    id: "CANCELLED",
    label: "Cancelled",
    publicTitle: "Cancelled",
    publicDescription: "This order has been cancelled.",
  },
]);

export const LEGACY_ORDER_STATUSES = Object.freeze([
  { id: "DRAFT", label: "Draft" },
  { id: "QUOTED", label: "Quoted" },
  { id: "PAYMENT_PENDING", label: "Payment pending" },
  { id: "PAID", label: "Paid" },
  { id: "PROCUREMENT_REVIEW", label: "Procurement review" },
  { id: "PROCUREMENT_STARTED", label: "Procurement started" },
  { id: "SUPPLIER_CONFIRMED", label: "Supplier confirmed" },
  { id: "SUPPLIER_UNAVAILABLE", label: "Supplier unavailable" },
  { id: "SUPPLIER_PROCESSING", label: "Supplier processing" },
  { id: "SHIPPING_QUOTE_REVIEW", label: "Shipping quote review" },
  { id: "SHIPPING_ADJUSTMENT_REQUIRED", label: "Shipping adjustment required" },
  { id: "CUSTOMER_APPROVAL_PENDING", label: "Customer approval pending" },
  { id: "READY_TO_SHIP", label: "Ready to ship" },
  { id: "EXCEPTION", label: "Exception" },
  { id: "REFUND_REVIEW", label: "Refund review" },
  { id: "PARTIALLY_REFUNDED", label: "Partially refunded" },
  { id: "REFUNDED", label: "Refunded" },
  { id: "request_received", label: "Request received" },
  { id: "availability_checking", label: "Availability checking" },
  { id: "awaiting_customer_confirmation", label: "Awaiting customer confirmation" },
  { id: "payment_authorized_or_paid", label: "Payment authorized or paid" },
  { id: "purchasing_from_supplier", label: "Purchasing from supplier" },
  { id: "supplier_processing", label: "Supplier processing" },
  { id: "shipped_internationally", label: "Shipped internationally" },
  { id: "customs_processing", label: "Customs processing" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
  { id: "return_requested", label: "Return requested" },
  { id: "refund_pending_from_supplier", label: "Refund pending from supplier" },
  { id: "refunded", label: "Refunded" },
  { id: "cancelled", label: "Cancelled" },
]);

export const ORDER_STATUSES = Object.freeze([
  ...FULFILLMENT_STATUSES,
  ...LEGACY_ORDER_STATUSES.filter(
    (legacy) => !FULFILLMENT_STATUSES.some((status) => status.id === legacy.id)
  ),
]);

const STATUS_BY_ID = new Map(ORDER_STATUSES.map((status) => [status.id, status]));

export function isOrderStatus(value) {
  return STATUS_BY_ID.has(value);
}

export function fulfillmentStatus(value) {
  return FULFILLMENT_STATUSES.find((status) => status.id === value) || null;
}

export function defaultFulfillmentCopy(value) {
  const status = fulfillmentStatus(value);
  if (!status) return null;
  return {
    publicTitle: status.publicTitle,
    publicDescription: status.publicDescription,
  };
}
