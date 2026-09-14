import { NextRequest } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@/lib/server/api-security";
import {
  getApiAuthContext,
  getServiceRoleClient,
  isLiveSupabaseAvailable,
} from "@/lib/server/supabase-server";
import { createNotification } from "@/lib/server/notifications";
import { mapCanonicalRole } from "@/lib/server/rbac";

const acceptInviteSchema = z.object({
  token: z.string().min(10, "Invalid invitation token"),
});

// POST /api/team/invitations/accept - Accept invitation and join organization
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required to accept an invitation", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`accept_inv_${auth.userId}`, 10, 60000);
  if (!rateCheck.allowed) {
    return apiError("Too many attempts. Please try again later.", 429, "RATE_LIMIT_EXCEEDED");
  }

  const serviceClient = getServiceRoleClient();
  if (!serviceClient || !isLiveSupabaseAvailable) {
    return apiError("Database service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const rawBody = await req.json();
    const { token } = acceptInviteSchema.parse(rawBody);

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    // 1. Find valid pending invitation
    const { data: invite, error: inviteErr } = await serviceClient
      .from("invitations")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("status", "pending")
      .maybeSingle();

    if (inviteErr || !invite) {
      return apiError("Invalid or expired invitation token", 404, "INVALID_TOKEN");
    }

    if (new Date(invite.expires_at) < new Date()) {
      await serviceClient
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invite.id);
      return apiError("This invitation has expired", 410, "INVITATION_EXPIRED");
    }

    const canonicalRole = mapCanonicalRole(invite.role);

    // 2. Capture current membership to support safe phantom-org cleanup.
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("org_id")
      .eq("user_id", auth.userId)
      .maybeSingle();
    const previousOrgId = existingProfile?.org_id || null;

    // 3. Bind authenticated user to organization with assigned role & region
    const { error: profileErr } = await serviceClient
      .from("profiles")
      .upsert({
        user_id: auth.userId,
        org_id: invite.org_id,
        role: canonicalRole,
        region_id: invite.region_id || null,
        updated_at: new Date().toISOString(),
      });

    if (profileErr) {
      console.error("[INVITATION_ACCEPT_ERROR]", profileErr);
      return apiError("Failed to update user profile with invitation", 500, "PROFILE_UPDATE_ERROR");
    }

    // 4. Mark invitation as accepted
    await serviceClient
      .from("invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    // 5. Phantom-org cleanup: delete a previously auto-provisioned org only when
    // it is now empty and has no domain data.
    if (previousOrgId && previousOrgId !== invite.org_id) {
      const [{ count: profileCount }, { count: leadsCount }, { count: peopleCount }, { count: projectsCount }] = await Promise.all([
        serviceClient.from("profiles").select("user_id", { count: "exact", head: true }).eq("org_id", previousOrgId),
        serviceClient.from("leads").select("id", { count: "exact", head: true }).eq("org_id", previousOrgId),
        serviceClient.from("people").select("id", { count: "exact", head: true }).eq("org_id", previousOrgId),
        serviceClient.from("projects").select("id", { count: "exact", head: true }).eq("org_id", previousOrgId),
      ]);

      const isPhantom = (profileCount ?? 0) === 0 && (leadsCount ?? 0) === 0 && (peopleCount ?? 0) === 0 && (projectsCount ?? 0) === 0;
      if (isPhantom) {
        await serviceClient.from("orgs").delete().eq("id", previousOrgId);
      }
    }

    // 6. Notify the inviter / org owners
    if (invite.invited_by) {
      await createNotification({
        orgId: invite.org_id,
        userId: invite.invited_by,
        title: "Invitation Accepted",
        message: `A new team member (${invite.email}) has joined as ${canonicalRole}.`,
        type: "team_invitation",
        priority: "normal",
        entityType: "team",
        link: "/users",
        dedupKey: `notif_inv_acc_${invite.id}`,
      });
    }

    return apiSuccess(
      {
        accepted: true,
        orgId: invite.org_id,
        role: canonicalRole,
        regionId: invite.region_id,
      },
      200
    );
  } catch (err) {
    return handleValidationError(err);
  }
}
