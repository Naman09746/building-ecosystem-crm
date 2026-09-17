import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@repo/core/lib/server/api-security";
import { getApiAuthContext } from "@repo/core/lib/server/supabase-server";
import { fetchCatalogItems, createCatalogItem } from "@repo/core/lib/server/catalog-actions";

export async function GET(req: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    const orgId = auth?.orgId || "org-1";

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const items = await fetchCatalogItems({
      orgId,
      type,
      category,
      search,
    });

    return apiSuccess({ items, count: items.length });
  } catch (err: any) {
    console.error("[CATALOG_ITEMS_GET_ERROR]", err);
    return apiError(err.message || "Failed to fetch catalog items", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    const orgId = auth?.orgId || "org-1";

    const body = await req.json();
    if (!body.sku || !body.name || !body.uom) {
      return apiError("sku, name, and uom are required fields", 400);
    }

    const item = await createCatalogItem({
      orgId,
      type: body.type || "material",
      sku: body.sku,
      name: body.name,
      category: body.category,
      brand: body.brand,
      uom: body.uom,
      retailPrice: Number(body.retailPrice || 0),
      wholesalePrice: Number(body.wholesalePrice || 0),
      moq: Number(body.moq || 1),
      specs: body.specs || {},
      isActive: body.isActive ?? true,
    });

    return apiSuccess({ item }, 201);
  } catch (err: any) {
    console.error("[CATALOG_ITEMS_POST_ERROR]", err);
    return apiError(err.message || "Failed to create catalog item", 500);
  }
}
