export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  academia: {
    Tables: {
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          exclusive_organization_id: string | null
          id: string
          is_published: boolean
          sort_order: number
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          exclusive_organization_id?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          exclusive_organization_id?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          enrolled_by: string | null
          organization_id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          enrolled_by?: string | null
          organization_id: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          enrolled_by?: string | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_masters: {
        Row: {
          checksum_sha256: string | null
          lesson_id: string
          master_ref: string
          updated_at: string
        }
        Insert: {
          checksum_sha256?: string | null
          lesson_id: string
          master_ref: string
          updated_at?: string
        }
        Update: {
          checksum_sha256?: string | null
          lesson_id?: string
          master_ref?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_masters_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          last_watched_at: string
          lesson_id: string
          organization_id: string
          percent: number
          position_seconds: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          last_watched_at?: string
          lesson_id: string
          organization_id: string
          percent?: number
          position_seconds?: number
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          last_watched_at?: string
          lesson_id?: string
          organization_id?: string
          percent?: number
          position_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number
          id: string
          is_published: boolean
          module_id: string
          sort_order: number
          title: string
          video_hash: string | null
          video_id: string
          video_provider: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          is_published?: boolean
          module_id: string
          sort_order?: number
          title: string
          video_hash?: string | null
          video_id?: string
          video_provider?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          is_published?: boolean
          module_id?: string
          sort_order?: number
          title?: string
          video_hash?: string | null
          video_id?: string
          video_provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_org: { Args: { _org: string }; Returns: boolean }
      current_org: { Args: never; Returns: string }
      current_role: { Args: never; Returns: string }
      is_lesson_unlocked: { Args: { _lesson: string }; Returns: boolean }
      is_platform: { Args: never; Returns: boolean }
      is_platform_admin: { Args: { _user: string }; Returns: boolean }
      legacy_org_id: { Args: never; Returns: string }
      list_org_people: {
        Args: never
        Returns: {
          email: string
          nome: string
          role: string
          user_id: string
        }[]
      }
      managed_org: { Args: never; Returns: string }
      my_context: { Args: never; Returns: Json }
      my_history: {
        Args: never
        Returns: {
          completed: boolean
          completed_at: string
          course_id: string
          course_title: string
          last_watched_at: string
          lesson_id: string
          lesson_title: string
          percent: number
        }[]
      }
      purge_orphans: { Args: never; Returns: number }
      team_progress_overview: {
        Args: never
        Returns: {
          user_id: string
          nome: string | null
          organization_id: string | null
          organization_nome: string | null
          team_id: string | null
          team_nome: string | null
          completed_lessons: number
          total_lessons: number
          current_lesson_id: string | null
          current_lesson_title: string | null
          current_lesson_position: number | null
          current_lesson_in_progress: boolean
          last_activity_at: string | null
        }[]
      }
      save_progress: {
        Args: { _lesson: string; _percent: number; _position: number }
        Returns: {
          completed: boolean
          completed_at: string | null
          last_watched_at: string
          lesson_id: string
          organization_id: string
          percent: number
          position_seconds: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "lesson_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_org: { Args: { _user: string }; Returns: string }
      user_role: { Args: { _user: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  academia: {
    Enums: {},
  },
} as const
