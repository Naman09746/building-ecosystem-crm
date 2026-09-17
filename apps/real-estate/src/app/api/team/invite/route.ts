import { NextRequest } from "next/server";
import crypto from "crypto";
import {
  apiSuccess,
  apiError,
  handleValidationError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import { createInvitationSchema } from "@repo/core/lib/server/validations";
import { isOwnerRole } from "@repo/core/lib/server/rbac";
import { withAuth } from "@repo/core/lib/server/with-auth";
import { MANAGER_ROLES } from "@repo/core/lib/server/supabase-server";

// POST /api/team/invite - Create a secure team invitation (Manager only)
export const POST = withAuth(
  async (req, { auth, supabase }) => {
    try {
      const rawBody = await req.json();
      const validated = createInvitationSchema.parse(rawBody);

    // Non-owners cannot invite owners
    if (validated.role === "owner" && !isOwnerRole(auth.role)) {
      return apiError("You cannot invite members with higher privileges than your own role", 403, "FORBIDDEN");
    }

    // Generate a cryptographically random invitation token and its SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const { data: invite, error } = await supabase
      .from("invitations")
      .insert({
        org_id: auth.orgId,
        email: validated.email.toLowerCase().trim(),
        role: validated.role,
        region_id: validated.regionId || null,
        token_hash: tokenHash,
        invited_by: auth.userId,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select(`*, regions:region_id (id, name)`)
      .single();

    if (error) {
      if (error.code === "P0001" || error.message?.includes("SEAT_QUOTA_EXCEEDED")) {
        return apiError("Seat quota exceeded. Upgrade your plan to invite more team members.", 402, "QUOTA_EXCEEDED");
      }
      if (error.code === "23505") {
        return apiError("A pending invitation already exists for this email address", 409, "DUPLICATE_INVITATION");
      }
      console.error("[INVITE_INSERT_ERROR]", error.code);
      return apiError("Failed to issue invitation", 500, "DB_INSERT_ERROR");
    }

    // In local/dev or production without external SMTP, return invitation metadata
    // with the one-time raw token for the manager to share with their recruit.
    return apiSuccess(
      {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        regionId: invite.region_id,
        regionName: invite.regions?.name || null,
        status: invite.status,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
        // Provided only once at creation time so managers can dispatch directly
        inviteToken: rawToken,
        inviteUrl: `/invite?token=${rawToken}`,
      },
      201
    );
    } catch (err) {
      return handleValidationError(err);
    }
  },
  {
    requiredRoles: MANAGER_ROLES,
    rateLimit: { limit: 20, windowMs: 60000, keyPrefix: "invite" },
  }
);
