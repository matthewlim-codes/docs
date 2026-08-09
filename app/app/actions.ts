"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type ReactionValue = "heart" | "thumbs_up" | "haha" | "exclamation" | "question";

export type ActionResult = {
  conversationId?: string;
  error?: string;
  message?: string;
  ok: boolean;
  requestId?: string;
};

function getDirectKey(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join(":");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

async function ensureDirectConversation(currentUserId: string, targetUserId: string) {
  const { supabase } = await requireUser();
  const directKey = getDirectKey(currentUserId, targetUserId);

  const { data: existingConversation, error: existingError } = await supabase
    .from("conversations")
    .select("id")
    .eq("direct_key", directKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingConversation) {
    return existingConversation.id as string;
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      created_by: currentUserId,
      direct_key: directKey,
      type: "direct"
    })
    .select("id")
    .single();

  if (conversationError || !conversation) {
    throw new Error(conversationError?.message || "Could not create conversation.");
  }

  const { error: membersError } = await supabase
    .from("conversation_members")
    .insert([
      {
        conversation_id: conversation.id as string,
        last_read_at: new Date().toISOString(),
        user_id: currentUserId
      },
      {
        conversation_id: conversation.id as string,
        user_id: targetUserId
      }
    ]);

  if (membersError) {
    throw new Error(membersError.message);
  }

  return conversation.id as string;
}

async function getRequestBetween(firstUserId: string, secondUserId: string) {
  const { supabase } = await requireUser();
  const { data: firstDirection } = await supabase
    .from("message_requests")
    .select("id, status, conversation_id, sender_id, receiver_id")
    .eq("sender_id", firstUserId)
    .eq("receiver_id", secondUserId)
    .maybeSingle();

  if (firstDirection) {
    return firstDirection;
  }

  const { data: secondDirection } = await supabase
    .from("message_requests")
    .select("id, status, conversation_id, sender_id, receiver_id")
    .eq("sender_id", secondUserId)
    .eq("receiver_id", firstUserId)
    .maybeSingle();

  return secondDirection;
}

export async function startDirectConversationAction(
  targetUserId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    if (targetUserId === user.id) {
      return { error: "You cannot message yourself.", ok: false };
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from("profiles")
      .select("id, is_private")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return { error: "That profile could not be found.", ok: false };
    }

    const request = await getRequestBetween(user.id, targetUserId);

    if ((targetProfile.is_private as boolean) && request?.status !== "accepted") {
      if (request?.sender_id === user.id && request.status === "pending") {
        return {
          message: "Your message request is still pending.",
          ok: true,
          requestId: request.id as string
        };
      }

      const { data: newRequest, error: requestError } = await supabase
        .from("message_requests")
        .insert({
          receiver_id: targetUserId,
          sender_id: user.id
        })
        .select("id")
        .single();

      if (requestError) {
        return { error: requestError.message, ok: false };
      }

      revalidatePath("/app");
      return {
        message: "Message request sent.",
        ok: true,
        requestId: newRequest.id as string
      };
    }

    const conversationId = await ensureDirectConversation(user.id, targetUserId);
    revalidatePath("/app");

    return { conversationId, ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not start conversation.",
      ok: false
    };
  }
}

export async function createGroupConversationAction(
  title: string,
  memberIds: string[]
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const normalizedTitle = title.trim();
    const uniqueMemberIds = Array.from(
      new Set(memberIds.filter((memberId) => memberId && memberId !== user.id))
    );

    if (normalizedTitle.length < 2 || normalizedTitle.length > 80) {
      return { error: "Group title must be between 2 and 80 characters.", ok: false };
    }

    if (uniqueMemberIds.length < 2) {
      return { error: "Choose at least two classmates for a group chat.", ok: false };
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        created_by: user.id,
        title: normalizedTitle,
        type: "group"
      })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      return {
        error: conversationError?.message || "Could not create group.",
        ok: false
      };
    }

    const { error: membersError } = await supabase
      .from("conversation_members")
      .insert(
        [user.id, ...uniqueMemberIds].map((memberId) => ({
          conversation_id: conversation.id as string,
          last_read_at: memberId === user.id ? new Date().toISOString() : null,
          user_id: memberId
        }))
      );

    if (membersError) {
      return { error: membersError.message, ok: false };
    }

    revalidatePath("/app");
    return { conversationId: conversation.id as string, ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create group.",
      ok: false
    };
  }
}

export async function sendMessageAction(
  conversationId: string,
  content: string
): Promise<ActionResult> {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return { error: "Message cannot be empty.", ok: false };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("messages").insert({
      content: trimmedContent,
      conversation_id: conversationId,
      sender_id: user.id
    });

    if (error) {
      return { error: error.message, ok: false };
    }

    await markConversationReadAction(conversationId);
    revalidatePath("/app");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not send message.",
      ok: false
    };
  }
}

export async function markConversationReadAction(
  conversationId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("conversation_members")
      .update({
        last_read_at: new Date().toISOString()
      })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message, ok: false };
    }

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update read status.",
      ok: false
    };
  }
}

export async function respondToMessageRequestAction(
  requestId: string,
  status: "accepted" | "declined"
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { data: request, error: requestError } = await supabase
      .from("message_requests")
      .select("id, sender_id, receiver_id")
      .eq("id", requestId)
      .eq("receiver_id", user.id)
      .single();

    if (requestError || !request) {
      return { error: "Message request could not be found.", ok: false };
    }

    let conversationId: string | null = null;

    if (status === "accepted") {
      conversationId = await ensureDirectConversation(
        request.receiver_id as string,
        request.sender_id as string
      );
    }

    const { error: updateError } = await supabase
      .from("message_requests")
      .update({
        conversation_id: conversationId,
        status
      })
      .eq("id", requestId);

    if (updateError) {
      return { error: updateError.message, ok: false };
    }

    revalidatePath("/app");
    return { conversationId: conversationId || undefined, ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update request.",
      ok: false
    };
  }
}

export async function setReactionAction(
  messageId: string,
  reaction: ReactionValue
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { data: existingReaction } = await supabase
      .from("message_reactions")
      .select("reaction")
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReaction?.reaction === reaction) {
      const { error: deleteError } = await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id);

      if (deleteError) {
        return { error: deleteError.message, ok: false };
      }
    } else {
      const { error: reactionError } = await supabase
        .from("message_reactions")
        .upsert(
          {
            message_id: messageId,
            reaction,
            user_id: user.id
          },
          {
            onConflict: "message_id,user_id"
          }
        );

      if (reactionError) {
        return { error: reactionError.message, ok: false };
      }
    }

    revalidatePath("/app");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not react to message.",
      ok: false
    };
  }
}
