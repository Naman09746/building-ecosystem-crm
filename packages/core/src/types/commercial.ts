export type CatalogItemType = "material" | "service" | "furniture" | "appliance" | "other";

export interface CatalogItem {
  id: string;
  orgId: string;
  type: CatalogItemType;
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  uom: string; // Unit of Measure (e.g., Bags, Pcs, Sq.Ft., Tonne)
  retailPrice: number;
  wholesalePrice: number;
  moq: number; // Minimum Order Quantity
  specs?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface QuoteItem {
  id: string;
  quoteId: string;
  catalogItemId?: string;
  catalogItem?: CatalogItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface Quote {
  id: string;
  orgId: string;
  leadId?: string;
  customerPersonId?: string;
  customerOrgId?: string;
  quoteNumber: string;
  status: QuoteStatus;
  totalAmount: number;
  validUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: QuoteItem[];
  customerName?: string;
}

export type OrderStatus = "confirmed" | "processing" | "partially_fulfilled" | "fulfilled" | "cancelled";

export interface OrderItem {
  id: string;
  orderId: string;
  catalogItemId?: string;
  catalogItem?: CatalogItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fulfilledQuantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  orgId: string;
  quoteId?: string;
  leadId?: string;
  customerPersonId?: string;
  customerOrgId?: string;
  dealerId?: string;
  siteId?: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  customerName?: string;
}

export interface InventoryStock {
  id: string;
  orgId: string;
  catalogItemId: string;
  catalogItem?: CatalogItem;
  locationName: string;
  batchLot?: string;
  quantity: number;
  lastUpdated: string;
}

export type InventoryMovementType = "receipt" | "dispatch" | "adjustment" | "return";

export interface InventoryMovement {
  id: string;
  orgId: string;
  catalogItemId: string;
  catalogItem?: CatalogItem;
  locationName: string;
  batchLot?: string;
  quantityChange: number;
  movementType: InventoryMovementType;
  referenceId?: string;
  notes?: string;
  createdAt: string;
}

export type DispatchChallanStatus = "pending" | "in_transit" | "delivered" | "failed";

export interface DispatchItem {
  id: string;
  challanId: string;
  orderItemId: string;
  catalogItemId: string;
  catalogItem?: CatalogItem;
  quantity: number;
}

export interface DispatchChallan {
  id: string;
  orgId: string;
  orderId: string;
  order?: Order;
  challanNumber: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  lrNo?: string;
  freightAmount?: number;
  status: DispatchChallanStatus;
  dispatchedAt: string;
  deliveredAt?: string;
  podPhotoUrl?: string;
  podReceiverName?: string;
  podReceivedAt?: string;
  shortBags?: number;
  damagedBags?: number;
  podNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: DispatchItem[];
}
