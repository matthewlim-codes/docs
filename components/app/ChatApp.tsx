"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";
import {
  AtSign,
  Check,
  Clock,
  Heart,
  Laugh,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
  Shield,
  SmilePlus,
  ThumbsUp,
  Users,
  X
} from "lucide-react";

import {
  createGroupConversationAction,
  markConversationReadAction,
  respondToMessageRequestAction,
  sendMessageAction,
  setReactionAction,
  startDirectConversationAction,
  type ReactionValue
} from "@/app/app/actions";
import { DisguiseOverlay } from "@/components/disguise/DisguiseOverlay";
import { useDisguise } from "@/components/disguise/DisguiseProvider";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/database.types";

type CurrentUser = {
  email: string | null;
  id: string;
};

type ProfileSummary = Pick<
  Profile,
  "avatar_url" | "bio" | "display_name" | "id" | "is_private" | "username"
>;

type ConversationMember = {
  last_read_at: string | null;
  profile: ProfileSummary;
  user_id: string;
};

type LastMessage = {
  content: string;
  created_at: string;
  id: string;
  sender_id: string;
};

type ConversationSummary = {
  created_at: string;
  id: string;
  lastMessage: LastMessage | null;
  members: ConversationMember[];
  title: string | null;
  type: "direct" | "group";
};

type ChatReaction = {
  reaction: ReactionValue;
  user_id: string;
};

type ChatMessage = {
  content: string;
  created_at: string;
  id: string;
  reactions: ChatReaction[];
  sender: ProfileSummary | null;
  sender_id: string;
};

type MessageRequest = {
  created_at: string;
  id: string;
  receiver: ProfileSummary | null;
  receiver_id: string;
  sender: ProfileSummary | null;
  sender_id: string;
  status: "pending" | "accepted" | "declined";
};

type RawProfileRelation = ProfileSummary | ProfileSummary[] | null;

type RawConversationMember = {
  last_read_at: string | null;
  profiles: RawProfileRelation;
  user_id: string;
};

type RawConversation = {
  conversation_members: RawConversationMember[] | null;
  created_at: string;
  id: string;
  messages: LastMessage[] | null;
  title: string | null;
  type: "direct" | "group";
};

type RawMessage = {
  content: string;
  created_at: string;
  id: string;
  message_reactions: ChatReaction[] | null;
  profiles: RawProfileRelation;
  sender_id: string;
};

type RawRequest = {
  created_at: string;
  id: string;
  receiver: RawProfileRelation;
  receiver_id: string;
  sender: RawProfileRelation;
  sender_id: string;
  status: "pending" | "accepted" | "declined";
};

const reactionOptions: Array<{
  icon: string;
  label: string;
  value: ReactionValue;
}> = [
  { icon: "♥", label: "Heart", value: "heart" },
  { icon: "👍", label: "Thumbs up", value: "thumbs_up" },
  { icon: "😂", label: "Haha", value: "haha" },
  { icon: "!!", label: "Emphasis", value: "exclamation" },
  { icon: "?", label: "Question", value: "question" }
];

function normalizeProfile(value: RawProfileRelation): ProfileSummary | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function formatTime(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getInitials(profile: ProfileSummary | null) {
  if (!profile) {
    return "?";
  }

  return profile.display_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ profile, size = "md" }: { profile: ProfileSummary | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = {
    lg: "h-14 w-14 text-base",
    md: "h-11 w-11 text-sm",
    sm: "h-8 w-8 text-xs"
  }[size];

  return (
    <div
      className={`${sizeClass} flex flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 font-bold text-white`}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          src={profile.avatar_url}
        />
      ) : (
        getInitials(profile)
      )}
    </div>
  );
}

export function ChatApp({
  currentUser,
  profile
}: {
  currentUser: CurrentUser;
  profile: ProfileSummary;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showDisguise } = useDisguise();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "discover" | "requests">("chats");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [messageDraft, setMessageDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [openReactionFor, setOpenReactionFor] = useState<string | null>(null);
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSummary[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );

  const getConversationName = useCallback(
    (conversation: ConversationSummary) => {
      if (conversation.type === "group") {
        return conversation.title || "Group chat";
      }

      const otherMember = conversation.members.find(
        (member) => member.user_id !== currentUser.id
      );

      return otherMember?.profile.display_name || "Direct message";
    },
    [currentUser.id]
  );

  const getConversationAvatar = useCallback(
    (conversation: ConversationSummary) => {
      if (conversation.type === "group") {
        return null;
      }

      return (
        conversation.members.find((member) => member.user_id !== currentUser.id)
          ?.profile || null
      );
    },
    [currentUser.id]
  );

  const normalizeConversation = useCallback(
    (rawConversation: RawConversation): ConversationSummary => {
      const members = (rawConversation.conversation_members || [])
        .map((member) => {
          const memberProfile = normalizeProfile(member.profiles);
          if (!memberProfile) {
            return null;
          }

          return {
            last_read_at: member.last_read_at,
            profile: memberProfile,
            user_id: member.user_id
          };
        })
        .filter((member): member is ConversationMember => Boolean(member));

      const lastMessage =
        (rawConversation.messages || []).sort(
          (first, second) =>
            new Date(second.created_at).getTime() -
            new Date(first.created_at).getTime()
        )[0] || null;

      return {
        created_at: rawConversation.created_at,
        id: rawConversation.id,
        lastMessage,
        members,
        title: rawConversation.title,
        type: rawConversation.type
      };
    },
    []
  );

  const loadConversations = useCallback(async () => {
    const { data, error: conversationsError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        type,
        title,
        created_at,
        conversation_members (
          user_id,
          last_read_at,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            bio,
            is_private
          )
        ),
        messages (
          id,
          content,
          created_at,
          sender_id
        )
      `
      );

    if (conversationsError) {
      setError(conversationsError.message);
      return;
    }

    const normalized = ((data || []) as unknown as RawConversation[])
      .map(normalizeConversation)
      .sort((first, second) => {
        const firstTime = first.lastMessage?.created_at || first.created_at;
        const secondTime = second.lastMessage?.created_at || second.created_at;
        return new Date(secondTime).getTime() - new Date(firstTime).getTime();
      });

    setConversations(normalized);
    setActiveConversationId((current) => current || normalized[0]?.id || null);
  }, [normalizeConversation, supabase]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select(
          `
          id,
          content,
          sender_id,
          created_at,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            bio,
            is_private
          ),
          message_reactions (
            user_id,
            reaction
          )
        `
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        setError(messagesError.message);
        return;
      }

      setMessages(
        ((data || []) as unknown as RawMessage[]).map((message) => ({
          content: message.content,
          created_at: message.created_at,
          id: message.id,
          reactions: message.message_reactions || [],
          sender: normalizeProfile(message.profiles),
          sender_id: message.sender_id
        }))
      );

      await markConversationReadAction(conversationId);
      await loadConversations();
    },
    [loadConversations, supabase]
  );

  const loadRequests = useCallback(async () => {
    const { data, error: requestsError } = await supabase
      .from("message_requests")
      .select(
        `
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        sender:profiles!message_requests_sender_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          bio,
          is_private
        ),
        receiver:profiles!message_requests_receiver_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          bio,
          is_private
        )
      `
      )
      .order("created_at", { ascending: false });

    if (requestsError) {
      setError(requestsError.message);
      return;
    }

    setRequests(
      ((data || []) as unknown as RawRequest[]).map((request) => ({
        created_at: request.created_at,
        id: request.id,
        receiver: normalizeProfile(request.receiver),
        receiver_id: request.receiver_id,
        sender: normalizeProfile(request.sender),
        sender_id: request.sender_id,
        status: request.status
      }))
    );
  }, [supabase]);

  const refreshEverything = useCallback(async () => {
    await Promise.all([loadConversations(), loadRequests()]);
  }, [loadConversations, loadRequests]);

  useEffect(() => {
    void refreshEverything();
  }, [refreshEverything]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    void loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel("noted-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void refreshEverything();
          if (activeConversationId) {
            void loadMessages(activeConversationId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => {
          if (activeConversationId) {
            void loadMessages(activeConversationId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_requests" },
        () => {
          void loadRequests();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members" },
        () => {
          void loadConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    activeConversationId,
    loadConversations,
    loadMessages,
    loadRequests,
    refreshEverything,
    supabase
  ]);

  useEffect(() => {
    const normalizedSearch = searchQuery.trim().replace(/[,%]/g, "");

    if (!normalizedSearch) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data, error: searchError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, is_private")
        .neq("id", currentUser.id)
        .or(
          `username.ilike.%${normalizedSearch}%,display_name.ilike.%${normalizedSearch}%`
        )
        .limit(12);

      if (searchError) {
        setError(searchError.message);
        return;
      }

      setSearchResults((data || []) as unknown as ProfileSummary[]);
    }, 180);

    return () => clearTimeout(timeout);
  }, [currentUser.id, searchQuery, supabase]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    setTypingUsers([]);
    const channel = supabase.channel(`typing:${activeConversationId}`, {
      config: {
        presence: {
          key: currentUser.id
        }
      }
    });
    typingChannel.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          typing: boolean;
          username: string;
          user_id: string;
        }>();
        const users = Object.values(state)
          .flat()
          .filter((presence) => presence.user_id !== currentUser.id && presence.typing)
          .map((presence) => presence.username);
        setTypingUsers(Array.from(new Set(users)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            typing: false,
            user_id: currentUser.id,
            username: profile.display_name
          });
        }
      });

    return () => {
      typingChannel.current = null;
      void supabase.removeChannel(channel);
    };
  }, [activeConversationId, currentUser.id, profile.display_name, supabase]);

  const trackTyping = useCallback(() => {
    if (!activeConversationId) {
      return;
    }

    const channel = typingChannel.current;

    if (!channel) {
      return;
    }

    void channel.track({
      typing: true,
      user_id: currentUser.id,
      username: profile.display_name
    });

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      void channel.track({
        typing: false,
        user_id: currentUser.id,
        username: profile.display_name
      });
    }, 1200);
  }, [activeConversationId, currentUser.id, profile.display_name]);

  async function handleSendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!activeConversationId || !messageDraft.trim()) {
      return;
    }

    const content = messageDraft;
    setMessageDraft("");
    const result = await sendMessageAction(activeConversationId, content);

    if (!result.ok) {
      setError(result.error || "Could not send message.");
      setMessageDraft(content);
      return;
    }

    await loadMessages(activeConversationId);
  }

  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    trackTyping();

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  }

  function handleStartDirect(targetUserId: string) {
    startTransition(async () => {
      const result = await startDirectConversationAction(targetUserId);

      if (!result.ok) {
        setError(result.error || "Could not start chat.");
        return;
      }

      if (result.conversationId) {
        setActiveConversationId(result.conversationId);
        setActiveTab("chats");
      } else if (result.message) {
        setError(result.message);
        setActiveTab("requests");
      }

      await refreshEverything();
    });
  }

  function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createGroupConversationAction(groupTitle, groupMemberIds);

      if (!result.ok) {
        setError(result.error || "Could not create group.");
        return;
      }

      setGroupMemberIds([]);
      setGroupTitle("");
      setIsGroupOpen(false);
      setActiveConversationId(result.conversationId || null);
      setActiveTab("chats");
      await refreshEverything();
    });
  }

  function handleRequestResponse(requestId: string, status: "accepted" | "declined") {
    startTransition(async () => {
      const result = await respondToMessageRequestAction(requestId, status);

      if (!result.ok) {
        setError(result.error || "Could not update request.");
        return;
      }

      if (result.conversationId) {
        setActiveConversationId(result.conversationId);
        setActiveTab("chats");
      }

      await refreshEverything();
    });
  }

  function handleReaction(messageId: string, reaction: ReactionValue) {
    startTransition(async () => {
      const result = await setReactionAction(messageId, reaction);

      if (!result.ok) {
        setError(result.error || "Could not react.");
      }

      setOpenReactionFor(null);
      if (activeConversationId) {
        await loadMessages(activeConversationId);
      }
    });
  }

  const receivedPendingRequests = requests.filter(
    (request) => request.receiver_id === currentUser.id && request.status === "pending"
  );
  const sentRequests = requests.filter((request) => request.sender_id === currentUser.id);

  const lastOwnMessage = [...messages]
    .reverse()
    .find((message) => message.sender_id === currentUser.id);
  const readBy = activeConversation?.members.filter(
    (member) =>
      member.user_id !== currentUser.id &&
      lastOwnMessage &&
      member.last_read_at &&
      new Date(member.last_read_at).getTime() >=
        new Date(lastOwnMessage.created_at).getTime()
  );

  return (
    <div className="relative h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div className="flex h-full">
        <aside className="flex w-full max-w-[390px] flex-col border-r border-slate-200 bg-white">
          <header className="border-b border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar profile={profile} />
                <div>
                  <h1 className="text-xl font-bold">Noted</h1>
                  <p className="text-xs text-slate-500">@{profile.username}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <form action="/auth/signout" method="post">
                  <button
                    className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                    title="Log out"
                    type="submit"
                  >
                    <LogOut aria-hidden className="h-5 w-5" />
                  </button>
                </form>
                <button
                  className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  onClick={() => setIsGroupOpen(true)}
                  title="New group"
                  type="button"
                >
                  <Users aria-hidden className="h-5 w-5" />
                </button>
                <button
                  className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  onClick={showDisguise}
                  title="Disguise"
                  type="button"
                >
                  <Shield aria-hidden className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
              {(["chats", "discover", "requests"] as const).map((tab) => (
                <button
                  className={`rounded-xl px-3 py-2 capitalize ${
                    activeTab === tab ? "bg-white shadow-sm" : "text-slate-500"
                  }`}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
          </header>

          {error ? (
            <div className="mx-5 mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex items-start justify-between gap-3">
                <span>{error}</span>
                <button onClick={() => setError(null)} type="button">
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === "chats" ? (
              <ConversationList
                activeConversationId={activeConversationId}
                conversations={conversations}
                currentUserId={currentUser.id}
                getConversationAvatar={getConversationAvatar}
                getConversationName={getConversationName}
                onSelect={setActiveConversationId}
              />
            ) : null}

            {activeTab === "discover" ? (
              <DiscoveryPanel
                groupMemberIds={groupMemberIds}
                isPending={isPending}
                onMessage={handleStartDirect}
                onSearchChange={setSearchQuery}
                onToggleGroupMember={(profileId) => {
                  setGroupMemberIds((current) =>
                    current.includes(profileId)
                      ? current.filter((memberId) => memberId !== profileId)
                      : [...current, profileId]
                  );
                }}
                query={searchQuery}
                results={searchResults}
              />
            ) : null}

            {activeTab === "requests" ? (
              <RequestsPanel
                currentUserId={currentUser.id}
                isPending={isPending}
                onRespond={handleRequestResponse}
                received={receivedPendingRequests}
                sent={sentRequests}
              />
            ) : null}
          </div>
        </aside>

        <main className="hidden min-w-0 flex-1 flex-col bg-[#f5f5f7] md:flex">
          {activeConversation ? (
            <>
              <ChatHeader
                conversation={activeConversation}
                getConversationAvatar={getConversationAvatar}
                name={getConversationName(activeConversation)}
              />
              <section className="flex-1 overflow-y-auto px-6 py-8">
                <div className="mx-auto flex max-w-3xl flex-col gap-3">
                  {messages.map((message) => (
                    <MessageBubble
                      currentUserId={currentUser.id}
                      key={message.id}
                      message={message}
                      onReact={handleReaction}
                      openReactionFor={openReactionFor}
                      setOpenReactionFor={setOpenReactionFor}
                    />
                  ))}
                  {typingUsers.length ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="flex gap-1 rounded-full bg-white px-3 py-2 shadow-sm">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
                      </span>
                      {typingUsers.join(", ")} typing
                    </div>
                  ) : null}
                  {readBy?.length ? (
                    <p className="pr-2 text-right text-xs font-medium text-slate-500">
                      Read by {readBy.map((member) => member.profile.display_name).join(", ")}
                    </p>
                  ) : null}
                </div>
              </section>
              <form
                className="border-t border-slate-200 bg-white/80 p-4 backdrop-blur"
                onSubmit={handleSendMessage}
              >
                <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-[1.7rem] border border-slate-200 bg-white p-2 shadow-sm">
                  <textarea
                    className="min-h-11 flex-1 resize-none border-0 bg-transparent px-4 py-3 text-sm outline-none"
                    onChange={(event) => {
                      setMessageDraft(event.target.value);
                      trackTyping();
                    }}
                    onKeyDown={handleMessageKeyDown}
                    placeholder="iMessage Noted..."
                    rows={1}
                    value={messageDraft}
                  />
                  <button
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-40"
                    disabled={!messageDraft.trim()}
                    type="submit"
                  >
                    <Send aria-hidden className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <MessageCircle className="mx-auto h-14 w-14 text-blue-500" />
                <h2 className="mt-4 text-2xl font-bold">Find someone to message</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use Discover to search by @username or display name, or create a
                  group chat with classmates.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {isGroupOpen ? (
        <GroupModal
          groupMemberIds={groupMemberIds}
          groupTitle={groupTitle}
          isPending={isPending}
          onClose={() => setIsGroupOpen(false)}
          onSubmit={handleCreateGroup}
          searchPanel={
            <DiscoveryPanel
              compact
              groupMemberIds={groupMemberIds}
              isPending={isPending}
              onMessage={handleStartDirect}
              onSearchChange={setSearchQuery}
              onToggleGroupMember={(profileId) => {
                setGroupMemberIds((current) =>
                  current.includes(profileId)
                    ? current.filter((memberId) => memberId !== profileId)
                    : [...current, profileId]
                );
              }}
              query={searchQuery}
              results={searchResults}
            />
          }
          setGroupTitle={setGroupTitle}
        />
      ) : null}

      <DisguiseOverlay />
    </div>
  );
}

function ConversationList({
  activeConversationId,
  conversations,
  currentUserId,
  getConversationAvatar,
  getConversationName,
  onSelect
}: {
  activeConversationId: string | null;
  conversations: ConversationSummary[];
  currentUserId: string;
  getConversationAvatar: (conversation: ConversationSummary) => ProfileSummary | null;
  getConversationName: (conversation: ConversationSummary) => string;
  onSelect: (conversationId: string) => void;
}) {
  if (!conversations.length) {
    return (
      <div className="p-8 text-center text-sm leading-6 text-slate-500">
        No conversations yet. Search for classmates in Discover to start one.
      </div>
    );
  }

  return (
    <div className="p-3">
      {conversations.map((conversation) => {
        const lastMessage = conversation.lastMessage;
        const isUnread = conversation.members.some(
          (member) =>
            member.user_id === currentUserId &&
            lastMessage &&
            (!member.last_read_at ||
              new Date(member.last_read_at).getTime() <
                new Date(lastMessage.created_at).getTime()) &&
            lastMessage.sender_id !== currentUserId
        );

        return (
          <button
            className={`flex w-full gap-3 rounded-3xl p-3 text-left transition ${
              activeConversationId === conversation.id
                ? "bg-blue-50"
                : "hover:bg-slate-50"
            }`}
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            type="button"
          >
            {conversation.type === "group" ? (
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-slate-900 text-white">
                <Users aria-hidden className="h-5 w-5" />
              </div>
            ) : (
              <Avatar profile={getConversationAvatar(conversation)} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold text-slate-950">
                  {getConversationName(conversation)}
                </p>
                <span className="text-xs text-slate-400">
                  {formatTime(lastMessage?.created_at)}
                </span>
              </div>
              <p
                className={`mt-1 truncate text-sm ${
                  isUnread ? "font-bold text-slate-900" : "text-slate-500"
                }`}
              >
                {lastMessage?.content || "No messages yet"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DiscoveryPanel({
  compact = false,
  groupMemberIds,
  isPending,
  onMessage,
  onSearchChange,
  onToggleGroupMember,
  query,
  results
}: {
  compact?: boolean;
  groupMemberIds: string[];
  isPending: boolean;
  onMessage: (profileId: string) => void;
  onSearchChange: (query: string) => void;
  onToggleGroupMember: (profileId: string) => void;
  query: string;
  results: ProfileSummary[];
}) {
  return (
    <div className={compact ? "" : "p-5"}>
      <label className="relative block">
        <Search
          aria-hidden
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search @username or name"
          value={query}
        />
      </label>

      <div className="mt-5 space-y-3">
        {results.map((result) => (
          <article
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
            key={result.id}
          >
            <div className="flex gap-3">
              <Avatar profile={result} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">{result.display_name}</h3>
                    <p className="text-sm font-semibold text-blue-600">
                      @{result.username}
                    </p>
                  </div>
                  {result.is_private ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      Private
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {result.bio || "No bio yet."}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    disabled={isPending}
                    onClick={() => onMessage(result.id)}
                    type="button"
                  >
                    <MessageCircle aria-hidden className="h-4 w-4" />
                    Message
                  </button>
                  <button
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${
                      groupMemberIds.includes(result.id)
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                    onClick={() => onToggleGroupMember(result.id)}
                    type="button"
                  >
                    {groupMemberIds.includes(result.id) ? (
                      <Check aria-hidden className="h-4 w-4" />
                    ) : (
                      <Plus aria-hidden className="h-4 w-4" />
                    )}
                    Group
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {query && !results.length ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            No matching profiles yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RequestsPanel({
  currentUserId,
  isPending,
  onRespond,
  received,
  sent
}: {
  currentUserId: string;
  isPending: boolean;
  onRespond: (requestId: string, status: "accepted" | "declined") => void;
  received: MessageRequest[];
  sent: MessageRequest[];
}) {
  return (
    <div className="space-y-6 p-5">
      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
          Requests for you
        </h2>
        <div className="mt-3 space-y-3">
          {received.map((request) => (
            <article
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              key={request.id}
            >
              <div className="flex gap-3">
                <Avatar profile={request.sender} />
                <div className="flex-1">
                  <p className="font-bold">{request.sender?.display_name}</p>
                  <p className="text-sm text-blue-600">@{request.sender?.username}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      disabled={isPending}
                      onClick={() => onRespond(request.id, "accepted")}
                      type="button"
                    >
                      Accept
                    </button>
                    <button
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
                      disabled={isPending}
                      onClick={() => onRespond(request.id, "declined")}
                      type="button"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!received.length ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              No pending requests.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
          Sent
        </h2>
        <div className="mt-3 space-y-2">
          {sent.map((request) => (
            <div
              className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm"
              key={request.id}
            >
              <span>
                To{" "}
                <strong>
                  {request.receiver_id === currentUserId
                    ? "you"
                    : request.receiver?.display_name}
                </strong>
              </span>
              <span className="capitalize text-slate-500">{request.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChatHeader({
  conversation,
  getConversationAvatar,
  name
}: {
  conversation: ConversationSummary;
  getConversationAvatar: (conversation: ConversationSummary) => ProfileSummary | null;
  name: string;
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        {conversation.type === "group" ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white">
            <Users aria-hidden className="h-5 w-5" />
          </div>
        ) : (
          <Avatar profile={getConversationAvatar(conversation)} />
        )}
        <div>
          <h2 className="font-bold">{name}</h2>
          <p className="text-xs text-slate-500">
            {conversation.members.length} member
            {conversation.members.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
        <Clock aria-hidden className="h-4 w-4" />
        Realtime
      </div>
    </header>
  );
}

function MessageBubble({
  currentUserId,
  message,
  onReact,
  openReactionFor,
  setOpenReactionFor
}: {
  currentUserId: string;
  message: ChatMessage;
  onReact: (messageId: string, reaction: ReactionValue) => void;
  openReactionFor: string | null;
  setOpenReactionFor: (messageId: string | null) => void;
}) {
  const isOwn = message.sender_id === currentUserId;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`relative max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn ? (
          <p className="mb-1 ml-3 text-xs font-semibold text-slate-500">
            {message.sender?.display_name}
          </p>
        ) : null}
        <button
          className={`rounded-[1.4rem] px-4 py-3 text-left text-sm leading-6 shadow-sm ${
            isOwn
              ? "rounded-br-md bg-blue-600 text-white"
              : "rounded-bl-md bg-white text-slate-950"
          }`}
          onDoubleClick={() => setOpenReactionFor(message.id)}
          type="button"
        >
          {message.content}
        </button>
        <div
          className={`mt-1 flex items-center gap-2 text-xs text-slate-400 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          <span>{formatTime(message.created_at)}</span>
          <button
            className="rounded-full p-1 hover:bg-white"
            onClick={() =>
              setOpenReactionFor(openReactionFor === message.id ? null : message.id)
            }
            type="button"
          >
            <SmilePlus aria-hidden className="h-4 w-4" />
          </button>
        </div>
        {message.reactions.length ? (
          <div
            className={`mt-1 flex gap-1 ${isOwn ? "justify-end" : "justify-start"}`}
          >
            {message.reactions.map((reaction) => (
              <span
                className="rounded-full bg-white px-2 py-1 text-xs shadow-sm"
                key={`${message.id}-${reaction.user_id}`}
              >
                {reactionOptions.find((option) => option.value === reaction.reaction)
                  ?.icon || "?"}
              </span>
            ))}
          </div>
        ) : null}
        {openReactionFor === message.id ? (
          <div
            className={`absolute z-10 mt-2 flex gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-xl ${
              isOwn ? "right-0" : "left-0"
            }`}
          >
            {reactionOptions.map((reaction) => (
              <button
                className="flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-bold hover:bg-slate-100"
                key={reaction.value}
                onClick={() => onReact(message.id, reaction.value)}
                title={reaction.label}
                type="button"
              >
                {reaction.value === "heart" ? (
                  <Heart aria-hidden className="h-4 w-4 fill-red-500 text-red-500" />
                ) : reaction.value === "thumbs_up" ? (
                  <ThumbsUp aria-hidden className="h-4 w-4" />
                ) : reaction.value === "haha" ? (
                  <Laugh aria-hidden className="h-4 w-4" />
                ) : (
                  reaction.icon
                )}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GroupModal({
  groupMemberIds,
  groupTitle,
  isPending,
  onClose,
  onSubmit,
  searchPanel,
  setGroupTitle
}: {
  groupMemberIds: string[];
  groupTitle: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  searchPanel: React.ReactNode;
  setGroupTitle: (title: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <form
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"
        onSubmit={onSubmit}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              New group
            </p>
            <h2 className="text-2xl font-bold">Create a group chat</h2>
          </div>
          <button
            className="rounded-full border border-slate-200 p-2"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-semibold text-slate-700">Group title</span>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            onChange={(event) => setGroupTitle(event.target.value)}
            placeholder="AP Bio lab partners"
            value={groupTitle}
          />
        </label>

        <div className="mt-5 rounded-3xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <AtSign aria-hidden className="h-4 w-4" />
            Select classmates
          </div>
          {searchPanel}
        </div>

        <button
          className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          disabled={isPending || groupMemberIds.length < 2}
          type="submit"
        >
          Create group with {groupMemberIds.length} selected
        </button>
      </form>
    </div>
  );
}
