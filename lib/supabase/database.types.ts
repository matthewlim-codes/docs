export type Json =
  | boolean
  | null
  | number
  | string
  | Json[]
  | { [key: string]: Json | undefined };

type GenericRelationship = {
  columns: string[];
  foreignKeyName: string;
  isOneToOne?: boolean;
  referencedColumns: string[];
  referencedRelation: string;
};

type GenericTable = {
  Insert: Record<string, unknown>;
  Relationships: GenericRelationship[];
  Row: Record<string, unknown>;
  Update: Record<string, unknown>;
};

type GenericView = {
  Relationships: GenericRelationship[];
  Row: Record<string, unknown>;
};

type GenericFunction = {
  Args: Record<string, unknown> | never;
  Returns: unknown;
};

type ProfileTable = {
  Row: {
    avatar_url: string | null;
    bio: string;
    created_at: string;
    display_name: string;
    id: string;
    is_private: boolean;
    username: string;
  } & Record<string, unknown>;
  Insert: {
    avatar_url?: string | null;
    bio?: string;
    created_at?: string;
    display_name: string;
    id: string;
    is_private?: boolean;
    username: string;
  } & Record<string, unknown>;
  Update: {
    avatar_url?: string | null;
    bio?: string;
    created_at?: string;
    display_name?: string;
    id?: string;
    is_private?: boolean;
    username?: string;
  } & Record<string, unknown>;
  Relationships: [
    {
      columns: ["id"];
      foreignKeyName: "profiles_id_fkey";
      isOneToOne: true;
      referencedColumns: ["id"];
      referencedRelation: "users";
    }
  ];
};

type ConversationTable = {
  Row: {
    created_at: string;
    created_by: string;
    direct_key: string | null;
    id: string;
    title: string | null;
    type: "direct" | "group";
  } & Record<string, unknown>;
  Insert: {
    created_at?: string;
    created_by: string;
    direct_key?: string | null;
    id?: string;
    title?: string | null;
    type: "direct" | "group";
  } & Record<string, unknown>;
  Update: {
    created_at?: string;
    created_by?: string;
    direct_key?: string | null;
    id?: string;
    title?: string | null;
    type?: "direct" | "group";
  } & Record<string, unknown>;
  Relationships: [];
};

type ConversationMemberTable = {
  Row: {
    conversation_id: string;
    joined_at: string;
    last_read_at: string | null;
    user_id: string;
  } & Record<string, unknown>;
  Insert: {
    conversation_id: string;
    joined_at?: string;
    last_read_at?: string | null;
    user_id: string;
  } & Record<string, unknown>;
  Update: {
    conversation_id?: string;
    joined_at?: string;
    last_read_at?: string | null;
    user_id?: string;
  } & Record<string, unknown>;
  Relationships: [];
};

type MessageTable = {
  Row: {
    attachments: Json[];
    content: string;
    conversation_id: string;
    created_at: string;
    id: string;
    sender_id: string;
  } & Record<string, unknown>;
  Insert: {
    attachments?: Json[];
    content: string;
    conversation_id: string;
    created_at?: string;
    id?: string;
    sender_id: string;
  } & Record<string, unknown>;
  Update: {
    attachments?: Json[];
    content?: string;
    conversation_id?: string;
    created_at?: string;
    id?: string;
    sender_id?: string;
  } & Record<string, unknown>;
  Relationships: [];
};

type MessageReactionTable = {
  Row: {
    created_at: string;
    message_id: string;
    reaction: "heart" | "thumbs_up" | "haha" | "exclamation" | "question";
    user_id: string;
  } & Record<string, unknown>;
  Insert: {
    created_at?: string;
    message_id: string;
    reaction: "heart" | "thumbs_up" | "haha" | "exclamation" | "question";
    user_id: string;
  } & Record<string, unknown>;
  Update: {
    created_at?: string;
    message_id?: string;
    reaction?: "heart" | "thumbs_up" | "haha" | "exclamation" | "question";
    user_id?: string;
  } & Record<string, unknown>;
  Relationships: [];
};

type MessageRequestTable = {
  Row: {
    conversation_id: string | null;
    created_at: string;
    id: string;
    receiver_id: string;
    sender_id: string;
    status: "pending" | "accepted" | "declined";
    updated_at: string;
  } & Record<string, unknown>;
  Insert: {
    conversation_id?: string | null;
    created_at?: string;
    id?: string;
    receiver_id: string;
    sender_id: string;
    status?: "pending" | "accepted" | "declined";
    updated_at?: string;
  } & Record<string, unknown>;
  Update: {
    conversation_id?: string | null;
    created_at?: string;
    id?: string;
    receiver_id?: string;
    sender_id?: string;
    status?: "pending" | "accepted" | "declined";
    updated_at?: string;
  } & Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    CompositeTypes: Record<string, unknown>;
    Enums: Record<string, unknown>;
    Functions: Record<string, GenericFunction>;
    Tables: {
      conversation_members: ConversationMemberTable;
      conversations: ConversationTable;
      message_reactions: MessageReactionTable;
      message_requests: MessageRequestTable;
      messages: MessageTable;
      profiles: ProfileTable;
    } & Record<string, GenericTable>;
    Views: Record<string, GenericView>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
