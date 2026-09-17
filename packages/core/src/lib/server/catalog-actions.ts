import { getAuthenticatedServerClient, getServiceRoleClient, isLiveSupabaseAvailable } from "./supabase-server";
import type { CatalogItem, CatalogItemType } from "../../types/commercial";

export interface CreateCatalogItemInput {
  orgId: string;
  type?: CatalogItemType;
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  uom: string;
  retailPrice: number;
  wholesalePrice: number;
  moq: number;
  specs?: Record<string, unknown>;
  isActive?: boolean;
}

import { INITIAL_CATALOG_ITEMS } from "../mock-data";

let inMemoryCatalogItems: CatalogItem[] = [...INITIAL_CATALOG_ITEMS];

export async function fetchCatalogItems(filters?: {
  orgId?: string;
  type?: string;
  category?: string;
  search?: string;
}): Promise<CatalogItem[]> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    let query = supabase.from("catalog_items").select("*");
    if (filters?.orgId) query = query.eq("orgId", filters.orgId);
    if (filters?.type) query = query.eq("type", filters.type);
    if (filters?.category && filters.category !== "all") query = query.eq("category", filters.category);
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((d: any) => ({
        id: d.id,
        orgId: d.org_id,
        type: d.type,
        sku: d.sku,
        name: d.name,
        category: d.category,
        brand: d.brand,
        uom: d.uom,
        retailPrice: Number(d.retail_price),
        wholesalePrice: Number(d.wholesale_price),
        moq: Number(d.moq),
        specs: d.specs || {},
        isActive: d.is_active,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    }
  }

  // In-memory fallback
  return inMemoryCatalogItems.filter((item) => {
    if (filters?.type && item.type !== filters.type) return false;
    if (filters?.category && filters.category !== "all" && item.category !== filters.category) return false;
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      return item.name.toLowerCase().includes(s) || item.sku.toLowerCase().includes(s);
    }
    return true;
  });
}

export async function createCatalogItem(input: CreateCatalogItemInput): Promise<CatalogItem> {
  const supabase = await getAuthenticatedServerClient() || getServiceRoleClient();

  if (supabase && isLiveSupabaseAvailable) {
    const { data, error } = await supabase
      .from("catalog_items")
      .insert({
        org_id: input.orgId,
        type: input.type || "material",
        sku: input.sku.trim().toUpperCase(),
        name: input.name.trim(),
        category: input.category?.trim().toLowerCase(),
        brand: input.brand?.trim(),
        uom: input.uom.trim(),
        retail_price: input.retailPrice,
        wholesale_price: input.wholesalePrice,
        moq: input.moq,
        specs: input.specs || {},
        is_active: input.isActive ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create catalog item: ${error.message}`);
    }

    return {
      id: data.id,
      orgId: data.org_id,
      type: data.type,
      sku: data.sku,
      name: data.name,
      category: data.category,
      brand: data.brand,
      uom: data.uom,
      retailPrice: Number(data.retail_price),
      wholesalePrice: Number(data.wholesale_price),
      moq: Number(data.moq),
      specs: data.specs || {},
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // In-memory fallback
  const newItem: CatalogItem = {
    id: `cat-${Date.now()}`,
    orgId: input.orgId,
    type: input.type || "material",
    sku: input.sku.trim().toUpperCase(),
    name: input.name.trim(),
    category: input.category?.trim().toLowerCase(),
    brand: input.brand?.trim(),
    uom: input.uom.trim(),
    retailPrice: input.retailPrice,
    wholesalePrice: input.wholesalePrice,
    moq: input.moq,
    specs: input.specs || {},
    isActive: input.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryCatalogItems.unshift(newItem);
  return newItem;
}
