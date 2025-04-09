export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          onboarding_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          onboarding_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      research_history: {
        Row: {
          created_at: string | null
          id: string
          model: string | null
          query: string
          use_case: string | null
          user_id: string
          user_model: string | null
          user_model_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model?: string | null
          query: string
          use_case?: string | null
          user_id: string
          user_model?: string | null
          user_model_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model?: string | null
          query?: string
          use_case?: string | null
          user_id?: string
          user_model?: string | null
          user_model_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_history_user_model_id_fkey"
            columns: ["user_model_id"]
            isOneToOne: false
            referencedRelation: "user_models"
            referencedColumns: ["id"]
          },
        ]
      }
      research_states: {
        Row: {
          active_nodes: number | null
          answer: string | null
          client_id: string | null
          completed_nodes: number | null
          created_at: string | null
          findings: Json | null
          findings_count: number | null
          human_interactions: Json | null
          id: string
          last_update: string | null
          query: string
          reasoning_path: string[] | null
          research_id: string
          session_id: string
          sources: string[] | null
          status: string
          updated_at: string | null
          user_id: string
          user_model: Json | null
        }
        Insert: {
          active_nodes?: number | null
          answer?: string | null
          client_id?: string | null
          completed_nodes?: number | null
          created_at?: string | null
          findings?: Json | null
          findings_count?: number | null
          human_interactions?: Json | null
          id?: string
          last_update?: string | null
          query: string
          reasoning_path?: string[] | null
          research_id: string
          session_id: string
          sources?: string[] | null
          status?: string
          updated_at?: string | null
          user_id: string
          user_model?: Json | null
        }
        Update: {
          active_nodes?: number | null
          answer?: string | null
          client_id?: string | null
          completed_nodes?: number | null
          created_at?: string | null
          findings?: Json | null
          findings_count?: number | null
          human_interactions?: Json | null
          id?: string
          last_update?: string | null
          query?: string
          reasoning_path?: string[] | null
          research_id?: string
          session_id?: string
          sources?: string[] | null
          status?: string
          updated_at?: string | null
          user_id?: string
          user_model?: Json | null
        }
        Relationships: []
      }
      user_models: {
        Row: {
          cognitive_style: string
          created_at: string | null
          domain: string
          expertise_level: string
          id: string
          included_sources: string[] | null
          is_default: boolean | null
          name: string
          source_priorities: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cognitive_style: string
          created_at?: string | null
          domain: string
          expertise_level: string
          id?: string
          included_sources?: string[] | null
          is_default?: boolean | null
          name: string
          source_priorities?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cognitive_style?: string
          created_at?: string | null
          domain?: string
          expertise_level?: string
          id?: string
          included_sources?: string[] | null
          is_default?: boolean | null
          name?: string
          source_priorities?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          onboarding_completed: boolean | null
          updated_at: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
