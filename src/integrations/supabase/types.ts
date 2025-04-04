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
          answer: string | null
          client_id: string | null
          created_at: string | null
          findings: Json | null
          human_interactions: Json | null
          id: string
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
          answer?: string | null
          client_id?: string | null
          created_at?: string | null
          findings?: Json | null
          human_interactions?: Json | null
          id?: string
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
          answer?: string | null
          client_id?: string | null
          created_at?: string | null
          findings?: Json | null
          human_interactions?: Json | null
          id?: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
