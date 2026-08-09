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

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    CompositeTypes: Record<string, unknown>;
    Enums: Record<string, unknown>;
    Functions: Record<string, GenericFunction>;
    Tables: {
      profiles: ProfileTable;
    } & Record<string, GenericTable>;
    Views: Record<string, GenericView>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
