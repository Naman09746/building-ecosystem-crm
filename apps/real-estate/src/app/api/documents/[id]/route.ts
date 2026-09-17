import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
} from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  getServiceRoleClient,
  isLiveSupabaseAvailable,
  MANAGER_ROLES,
} from "@repo/core/lib/server/supabase-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/documents/[id] - Remove document from DB and storage vault (Manager only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (!MANAGER_ROLES.includes(auth.role)) {
    return apiError("Only managers and admins can delete documents", 403, "FORBIDDEN");
  }

  const { id: docId } = await params;
  const supabase = await getAuthenticatedServerClient();
  const serviceClient = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable || !serviceClient) {
    return apiError("Storage service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: doc, error: fetchErr } = await supabase
      .from("documents")
      .select("id, org_id, file_url")
      .eq("id", docId)
      .eq("org_id", auth.orgId)
      .maybeSingle();

    if (fetchErr || !doc) {
      return apiError("Document not found", 404, "NOT_FOUND");
    }

    // 1. Delete database record
    const { error: dbDeleteErr } = await supabase
      .from("documents")
      .delete()
      .eq("id", docId)
      .eq("org_id", auth.orgId);

    if (dbDeleteErr) {
      return apiError("Failed to delete document metadata", 500, "DB_DELETE_ERROR");
    }

    // 2. Clean up storage object
    let storagePath = doc.file_url;
    if (storagePath.startsWith("http")) {
      const parts = storagePath.split("/crm-documents/");
      if (parts[1]) {
        storagePath = parts[1].split("?")[0];
      }
    }
    await serviceClient.storage.from("crm-documents").remove([storagePath]);

    return apiSuccess({ deleted: true, docId }, 200);
  } catch {
    return apiError("Failed to process document deletion", 500, "SERVER_ERROR");
  }
}
