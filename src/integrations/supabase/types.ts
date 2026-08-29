export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          details: Json | null;
          entity: string;
          entity_id: string | null;
          id: string;
          user_id: string | null;
          user_name: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          details?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: string;
          user_id?: string | null;
          user_name?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          details?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          user_id?: string | null;
          user_name?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          is_default: boolean;
          is_demo: boolean;
          name: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          is_demo?: boolean;
          name: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          is_demo?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          is_demo: boolean;
          name: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          name: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          is_read: boolean;
          title: string;
          type: string;
          user_id: string;
          work_item_id: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          title: string;
          type?: string;
          user_id: string;
          work_item_id?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
          work_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_work_item_id_fkey";
            columns: ["work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          is_demo: boolean;
          position: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          is_demo?: boolean;
          position?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          is_demo?: boolean;
          position?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      user_permissions: {
        Row: {
          can_create: boolean;
          can_delete: boolean;
          can_edit: boolean;
          can_view: boolean;
          id: string;
          module: string;
          user_id: string;
        };
        Insert: {
          can_create?: boolean;
          can_delete?: boolean;
          can_edit?: boolean;
          can_view?: boolean;
          id?: string;
          module: string;
          user_id: string;
        };
        Update: {
          can_create?: boolean;
          can_delete?: boolean;
          can_edit?: boolean;
          can_view?: boolean;
          id?: string;
          module?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      work_assignees: {
        Row: {
          created_at: string;
          user_id: string;
          work_item_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
          work_item_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
          work_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_assignees_profile_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_assignees_work_item_id_fkey";
            columns: ["work_item_id"];
            isOneToOne: false;
            referencedRelation: "work_items";
            referencedColumns: ["id"];
          },
        ];
      };
      work_items: {
        Row: {
          attachment_name: string | null;
          attachment_url: string | null;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          end_time: string | null;
          id: string;
          is_demo: boolean;
          location_id: string | null;
          location_text: string | null;
          note: string | null;
          priority: Database["public"]["Enums"]["work_priority"];
          start_time: string | null;
          status: Database["public"]["Enums"]["work_status"];
          title: string;
          updated_at: string;
          work_date: string;
        };
        Insert: {
          attachment_name?: string | null;
          attachment_url?: string | null;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_time?: string | null;
          id?: string;
          is_demo?: boolean;
          location_id?: string | null;
          location_text?: string | null;
          note?: string | null;
          priority?: Database["public"]["Enums"]["work_priority"];
          start_time?: string | null;
          status?: Database["public"]["Enums"]["work_status"];
          title: string;
          updated_at?: string;
          work_date: string;
        };
        Update: {
          attachment_name?: string | null;
          attachment_url?: string | null;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_time?: string | null;
          id?: string;
          is_demo?: boolean;
          location_id?: string | null;
          location_text?: string | null;
          note?: string | null;
          priority?: Database["public"]["Enums"]["work_priority"];
          start_time?: string | null;
          status?: Database["public"]["Enums"]["work_status"];
          title?: string;
          updated_at?: string;
          work_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_items_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_protected_owner: { Args: { _user_id: string }; Returns: boolean };
      owner_email: { Args: never; Returns: string };
    };
    Enums: {
      app_role: "admin" | "staff";
      work_priority: "low" | "medium" | "high" | "urgent";
      work_status: "pending" | "in_progress" | "completed" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      work_priority: ["low", "medium", "high", "urgent"],
      work_status: ["pending", "in_progress", "completed", "cancelled"],
    },
  },
} as const;
