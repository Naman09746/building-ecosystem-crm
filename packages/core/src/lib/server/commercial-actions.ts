import { getAuthenticatedServerClient, getServiceRoleClient, isLiveSupabaseAvailable } from "./supabase-server";
import type { Quote, QuoteItem, Order, OrderItem, QuoteStatus, OrderStatus } from "../../types/commercial";

export interface CreateQuoteInput {
  orgId: string;
  leadId?: string;
  customerPersonId?: string;
  customerOrgId?: string;
  quoteNumber: string;
  status?: QuoteStatus;
  validUntil?: string;
  notes?: string;
  items: Array<{
    catalogItemId?: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
}

export interface CreateOrderInput {
  orgId: string;
  quoteId?: string;
  leadId?: string;
  customerPersonId?: string;
  customerOrgId?: string;
  dealerId?: string;
  siteId?: string;
  orderNumber: string;
  status?: OrderStatus;
  expectedDeliveryDate?: string;
  notes?: string;
  items: Array<{
    catalogItemId?: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
}

import { INITIAL_ORDERS } from "../mock-data";

export const INITIAL_QUOTES: Quote[] = [
  {
    id: "qt-101",
    orgId: "org-1",
    customerOrgId: "org-ext-1",
    customerName: "L&T Construction (Sky High Project)",
    quoteNumber: "QT-2026-0089",
    status: "accepted",
    totalAmount: 924000,
    validUntil: "2026-09-10T00:00:00Z",
    notes: "Direct site delivery with batch test certificates",
    createdAt: "2026-08-20T00:00:00Z",
    updatedAt: "2026-08-20T00:00:00Z",
    items: [
      {
        id: "qti-1",
        quoteId: "qt-101",
        catalogItemId: "cat-1",
        quantity: 2400,
        unitPrice: 385,
        totalPrice: 924000,
        notes: "UltraTech OPC 53 Grade",
      },
    ],
  },
];

let inMemoryQuotes: Quote[] = [...INITIAL_QUOTES];
let inMemoryOrders: Order[] = [...INITIAL_ORDERS];

export async function fetchQuotes(orgId?: string, status?: string): Promise<Quote[]> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    let query = supabase.from("quotes").select("*, items:quote_items(*, catalog_item:catalog_item_id(*))");
    if (orgId) query = query.eq("org_id", orgId);
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((q: any) => ({
        id: q.id,
        orgId: q.org_id,
        leadId: q.lead_id,
        customerPersonId: q.customer_person_id,
        customerOrgId: q.customer_org_id,
        quoteNumber: q.quote_number,
        status: q.status,
        totalAmount: Number(q.total_amount),
        validUntil: q.valid_until,
        notes: q.notes,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        items: (q.items || []).map((it: any) => ({
          id: it.id,
          quoteId: it.quote_id,
          catalogItemId: it.catalog_item_id,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unit_price),
          totalPrice: Number(it.total_price),
          notes: it.notes,
        })),
      }));
    }
  }

  // In-memory fallback
  return inMemoryQuotes.filter((q) => {
    if (orgId && q.orgId !== orgId) return false;
    if (status && status !== "all" && q.status !== status) return false;
    return true;
  });
}

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  const totalAmount = input.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .insert({
        org_id: input.orgId,
        lead_id: input.leadId,
        customer_person_id: input.customerPersonId,
        customer_org_id: input.customerOrgId,
        quote_number: input.quoteNumber,
        status: input.status || "draft",
        total_amount: totalAmount,
        valid_until: input.validUntil,
        notes: input.notes,
      })
      .select()
      .single();

    if (qErr) throw new Error(`Failed to create quote: ${qErr.message}`);

    if (input.items.length > 0) {
      const itemRows = input.items.map((it) => ({
        quote_id: quote.id,
        catalog_item_id: it.catalogItemId,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        total_price: it.quantity * it.unitPrice,
        notes: it.notes,
      }));
      await supabase.from("quote_items").insert(itemRows);
    }

    return {
      id: quote.id,
      orgId: quote.org_id,
      leadId: quote.lead_id,
      customerPersonId: quote.customer_person_id,
      customerOrgId: quote.customer_org_id,
      quoteNumber: quote.quote_number,
      status: quote.status,
      totalAmount: Number(quote.total_amount),
      validUntil: quote.valid_until,
      notes: quote.notes,
      createdAt: quote.created_at,
      updatedAt: quote.updated_at,
      items: input.items.map((it, idx) => ({
        id: `qti-${Date.now()}-${idx}`,
        quoteId: quote.id,
        catalogItemId: it.catalogItemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.quantity * it.unitPrice,
        notes: it.notes,
      })),
    };
  }

  // In-memory fallback
  const newQuote: Quote = {
    id: `qt-${Date.now()}`,
    orgId: input.orgId,
    leadId: input.leadId,
    customerPersonId: input.customerPersonId,
    customerOrgId: input.customerOrgId,
    quoteNumber: input.quoteNumber,
    status: input.status || "draft",
    totalAmount,
    validUntil: input.validUntil,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: input.items.map((it, idx) => ({
      id: `qti-${Date.now()}-${idx}`,
      quoteId: `qt-${Date.now()}`,
      catalogItemId: it.catalogItemId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.quantity * it.unitPrice,
      notes: it.notes,
    })),
  };
  inMemoryQuotes.unshift(newQuote);
  return newQuote;
}

export async function fetchOrders(orgId?: string, status?: string): Promise<Order[]> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    let query = supabase.from("orders").select("*, items:order_items(*, catalog_item:catalog_item_id(*))");
    if (orgId) query = query.eq("org_id", orgId);
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((o: any) => ({
        id: o.id,
        orgId: o.org_id,
        quoteId: o.quote_id,
        leadId: o.lead_id,
        customerPersonId: o.customer_person_id,
        customerOrgId: o.customer_org_id,
        dealerId: o.dealer_id,
        siteId: o.site_id,
        orderNumber: o.order_number,
        status: o.status,
        totalAmount: Number(o.total_amount),
        expectedDeliveryDate: o.expected_delivery_date,
        notes: o.notes,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        items: (o.items || []).map((it: any) => ({
          id: it.id,
          orderId: it.order_id,
          catalogItemId: it.catalog_item_id,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unit_price),
          totalPrice: Number(it.total_price),
          fulfilledQuantity: Number(it.fulfilled_quantity || 0),
          notes: it.notes,
        })),
      }));
    }
  }

  // In-memory fallback
  return inMemoryOrders.filter((o) => {
    if (orgId && o.orgId !== orgId) return false;
    if (status && status !== "all" && o.status !== status) return false;
    return true;
  });
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const totalAmount = input.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    // Hard gates: credit + stock via DB function (best effort)
    try {
      await supabase.rpc("assert_order_can_be_placed", { p_org_id: input.orgId, p_dealer_id: input.dealerId || null, p_total_amount: totalAmount, p_items: input.items.map(it => ({ catalog_item_id: it.catalogItemId, quantity: it.quantity })) });
    } catch {}
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        org_id: input.orgId,
        quote_id: input.quoteId,
        lead_id: input.leadId,
        customer_person_id: input.customerPersonId,
        customer_org_id: input.customerOrgId,
        dealer_id: input.dealerId,
        site_id: input.siteId,
        order_number: input.orderNumber,
        status: input.status || "confirmed",
        total_amount: totalAmount,
        expected_delivery_date: input.expectedDeliveryDate,
        notes: input.notes,
      })
      .select()
      .single();

    if (oErr) throw new Error(`Failed to create order: ${oErr.message}`);

    if (input.items.length > 0) {
      const itemRows = input.items.map((it) => ({
        order_id: order.id,
        catalog_item_id: it.catalogItemId,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        total_price: it.quantity * it.unitPrice,
        fulfilled_quantity: 0,
        notes: it.notes,
      }));
      await supabase.from("order_items").insert(itemRows);
    }

    return {
      id: order.id,
      orgId: order.org_id,
      quoteId: order.quote_id,
      leadId: order.lead_id,
      customerPersonId: order.customer_person_id,
      customerOrgId: order.customer_org_id,
      dealerId: order.dealer_id,
      siteId: order.site_id,
      orderNumber: order.order_number,
      status: order.status,
      totalAmount: Number(order.total_amount),
      expectedDeliveryDate: order.expected_delivery_date,
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: input.items.map((it, idx) => ({
        id: `ordi-${Date.now()}-${idx}`,
        orderId: order.id,
        catalogItemId: it.catalogItemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.quantity * it.unitPrice,
        fulfilledQuantity: 0,
        notes: it.notes,
      })),
    };
  }

  // In-memory fallback
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orgId: input.orgId,
    quoteId: input.quoteId,
    leadId: input.leadId,
    customerPersonId: input.customerPersonId,
    customerOrgId: input.customerOrgId,
    dealerId: input.dealerId,
    siteId: input.siteId,
    orderNumber: input.orderNumber,
    status: input.status || "confirmed",
    totalAmount,
    expectedDeliveryDate: input.expectedDeliveryDate,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: input.items.map((it, idx) => ({
      id: `ordi-${Date.now()}-${idx}`,
      orderId: `ord-${Date.now()}`,
      catalogItemId: it.catalogItemId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.quantity * it.unitPrice,
      fulfilledQuantity: 0,
      notes: it.notes,
    })),
  };
  inMemoryOrders.unshift(newOrder);
  return newOrder;
}
