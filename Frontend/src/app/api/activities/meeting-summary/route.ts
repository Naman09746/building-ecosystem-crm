import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleValidationError } from "@/lib/server/api-security";
import { freeTextMeetingSummarySchema, confirmMeetingDispositionSchema } from "@/lib/server/validations";
import { structureFreeTextMeetingNotes } from "@/lib/server/aria-tools";
import {
  getApiAuthContext,
  getServiceRoleClient,
  isLiveSupabaseAvailable,
} from "@/lib/server/supabase-server";

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  try {
    const body = await req.json();
    
    // Check if this is a free-text structuring request OR a confirmed disposition save
    if (body.rawNotes !== undefined) {
      const parsed = freeTextMeetingSummarySchema.safeParse(body);
      if (!parsed.success) {
        return handleValidationError(parsed.error);
      }

      const structured = structureFreeTextMeetingNotes({
        rawNotes: parsed.data.rawNotes,
        leadId: parsed.data.leadId,
        unitId: parsed.data.unitId || undefined,
        personName: parsed.data.personName,
        spokenLanguage: parsed.data.spokenLanguage,
      });

      // Strictly returns structured draft proposal — NEVER writes to database without approval
      return apiSuccess({
        proposal: structured,
        message: "AI has structured meeting notes. Human review & confirmation required before saving.",
      });
    }

    // Confirmed disposition write with human approval
    const parsedConfirm = confirmMeetingDispositionSchema.safeParse(body);
    if (!parsedConfirm.success) {
      return handleValidationError(parsedConfirm.error);
    }

    const {
      leadId,
      unitId,
      activityType,
      outcome,
      outcomeLabel,
      suggestedStage,
      sentiment,
      budgetConfirmed,
      extractedObjections,
      buyingSignals,
      conversationSummary,
      suggestedNextMove,
      scheduledFollowUpAt,
      notes,
    } = parsedConfirm.data;

    const supabase = getServiceRoleClient();
    if (!supabase || !isLiveSupabaseAvailable) {
      return apiSuccess({
        success: true,
        activityId: `act-${Date.now()}`,
        message: "Activity logged and stage updated successfully with human confirmation.",
      });
    }

    // 1. Insert immutable activity record
    const { data: activity, error: actError } = await supabase
      .from("activities")
      .insert({
        org_id: auth.orgId,
        lead_id: leadId,
        unit_id: unitId || null,
        user_id: auth.userId,
        type: activityType,
        outcome,
        outcome_label: outcomeLabel,
        notes: notes || conversationSummary,
        scheduled_follow_up_at: scheduledFollowUpAt || null,
        metadata: {
          sentiment,
          extractedObjections,
          buyingSignals,
          suggestedNextMove,
          humanConfirmedBy: auth.userId,
        },
      })
      .select()
      .single();

    if (actError) {
      return apiError(actError.message, 500, "DB_INSERT_ERROR");
    }

    // 2. Update lead attributes & stage if provided
    const leadUpdates: Record<string, any> = {
      last_activity_text: `${outcomeLabel}: ${conversationSummary.slice(0, 120)}`,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (suggestedStage) {
      leadUpdates.stage = suggestedStage;
    }
    if (budgetConfirmed) {
      leadUpdates.budget = budgetConfirmed;
    }
    if (extractedObjections.length > 0) {
      leadUpdates.objections = extractedObjections;
    }
    if (buyingSignals.length > 0) {
      leadUpdates.buying_signals = buyingSignals;
    }
    if (suggestedNextMove) {
      leadUpdates.suggested_next_move = suggestedNextMove;
    }
    if (scheduledFollowUpAt) {
      leadUpdates.next_follow_up_at = scheduledFollowUpAt;
    }

    await supabase.from("leads").update(leadUpdates).eq("org_id", auth.orgId).eq("id", leadId);

    // 3. Create scheduled follow-up task if date provided
    if (scheduledFollowUpAt) {
      await supabase.from("tasks").insert({
        org_id: auth.orgId,
        lead_id: leadId,
        assigned_to_user_id: auth.userId,
        title: `Follow up: ${suggestedNextMove.slice(0, 80)}`,
        due_at: scheduledFollowUpAt,
        status: "upcoming",
        priority: "high",
        created_from_activity_id: activity.id,
      });
    }

    return apiSuccess({
      activity,
      message: "Meeting disposition confirmed and state updated successfully.",
    }, 201);
  } catch (err: any) {
    return apiError(err.message || "Failed to process meeting summary", 500, "INTERNAL_ERROR");
  }
}
