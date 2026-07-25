export const ORDER_STATUSES = Object.freeze([
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

export function isOrderStatus(value) {
  return ORDER_STATUSES.some((status) => status.id === value);
}
