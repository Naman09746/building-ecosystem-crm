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
} from "@repo/core/lib/server/supabase-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/documents/[id]/download - Generate fresh signed URL for secure private document access
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const { id: docId } = await params;
  const supabase = await getAuthenticatedServerClient();
  const serviceClient = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable || !serviceClient) {
    return apiError("Storage service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, org_id, file_url, title, type")
      .eq("id", docId)
      .eq("org_id", auth.orgId)
      .maybeSingle();

    if (error || !doc) {
      return apiError("Document not found", 404, "NOT_FOUND");
    }

    // Extract storage path from file_url
    let storagePath = doc.file_url;
    if (storagePath.startsWith("http")) {
      const parts = storagePath.split("/crm-documents/");
      if (parts[1]) {
        storagePath = parts[1].split("?")[0];
      }
    }

    const { data: signed, error: signErr } = await serviceClient.storage
      .from("crm-documents")
      .createSignedUrl(storagePath, 3600);

    if (signErr || !signed?.signedUrl) {
      return apiSuccess({ downloadUrl: doc.file_url, title: doc.title }, 200);
    }

    return apiSuccess({ downloadUrl: signed.signedUrl, title: doc.title }, 200);
  } catch {
    return apiError("Failed to generate download URL", 500, "SERVER_ERROR");
  }
}
