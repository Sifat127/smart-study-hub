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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chapter_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          chapter_id: string | null
          chapter_title: string | null
          course_id: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          chapter_id?: string | null
          chapter_title?: string | null
          course_id?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          chapter_id?: string | null
          chapter_title?: string | null
          course_id?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      chapter_downloads: {
        Row: {
          chapter_id: string
          downloaded_at: string
          file_name: string | null
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          downloaded_at?: string
          file_name?: string | null
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          downloaded_at?: string
          file_name?: string | null
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_downloads_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_downloads_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          course_id: string
          description: string | null
          file_id: string | null
          id: string
          notes_name: string | null
          notes_path: string | null
          notes_url: string | null
          pdf_name: string | null
          pdf_path: string | null
          pdf_url: string | null
          title: string
          uploaded_at: string
        }
        Insert: {
          course_id: string
          description?: string | null
          file_id?: string | null
          id?: string
          notes_name?: string | null
          notes_path?: string | null
          notes_url?: string | null
          pdf_name?: string | null
          pdf_path?: string | null
          pdf_url?: string | null
          title: string
          uploaded_at?: string
        }
        Update: {
          course_id?: string
          description?: string | null
          file_id?: string | null
          id?: string
          notes_name?: string | null
          notes_path?: string | null
          notes_url?: string | null
          pdf_name?: string | null
          pdf_path?: string | null
          pdf_url?: string | null
          title?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          problem_type: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          problem_type: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          problem_type?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          department: string
          id: string
          name: string
          semester: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department: string
          id?: string
          name: string
          semester?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department?: string
          id?: string
          name?: string
          semester?: number
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string
          full_name: string
          icon: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          full_name: string
          icon?: string
          id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          full_name?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      file_deletion_failures: {
        Row: {
          attempts: number
          bucket_name: string
          created_at: string
          id: string
          last_attempt_at: string | null
          object_key: string
          reason: string | null
          storage_provider: string
        }
        Insert: {
          attempts?: number
          bucket_name: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          object_key: string
          reason?: string | null
          storage_provider: string
        }
        Update: {
          attempts?: number
          bucket_name?: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          object_key?: string
          reason?: string | null
          storage_provider?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          bucket_name: string
          course_code: string | null
          course_id: string | null
          department: string | null
          download_count: number
          file_size: number
          file_type: string
          id: string
          last_updated: string
          object_key: string
          original_filename: string
          public_url: string | null
          semester: string | null
          sha256: string | null
          storage_provider: string
          subject: string | null
          tags: string[]
          title: string
          unique_filename: string
          upload_date: string
          uploader_id: string | null
          visibility: Database["public"]["Enums"]["file_visibility"]
          year: string | null
        }
        Insert: {
          bucket_name: string
          course_code?: string | null
          course_id?: string | null
          department?: string | null
          download_count?: number
          file_size: number
          file_type: string
          id?: string
          last_updated?: string
          object_key: string
          original_filename: string
          public_url?: string | null
          semester?: string | null
          sha256?: string | null
          storage_provider?: string
          subject?: string | null
          tags?: string[]
          title: string
          unique_filename: string
          upload_date?: string
          uploader_id?: string | null
          visibility?: Database["public"]["Enums"]["file_visibility"]
          year?: string | null
        }
        Update: {
          bucket_name?: string
          course_code?: string | null
          course_id?: string | null
          department?: string | null
          download_count?: number
          file_size?: number
          file_type?: string
          id?: string
          last_updated?: string
          object_key?: string
          original_filename?: string
          public_url?: string | null
          semester?: string | null
          sha256?: string | null
          storage_provider?: string
          subject?: string | null
          tags?: string[]
          title?: string
          unique_filename?: string
          upload_date?: string
          uploader_id?: string | null
          visibility?: Database["public"]["Enums"]["file_visibility"]
          year?: string | null
        }
        Relationships: []
      }
      profile_audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          target_user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          target_user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batch: string | null
          bio: string | null
          created_at: string
          current_semester: string | null
          department: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          roll_number: string | null
          section: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          batch?: string | null
          bio?: string | null
          created_at?: string
          current_semester?: string | null
          department?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          roll_number?: string | null
          section?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          batch?: string | null
          bio?: string | null
          created_at?: string
          current_semester?: string | null
          department?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          roll_number?: string | null
          section?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      semesters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          number: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          number: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          number?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_uploads: {
        Row: {
          batch: string
          course_id: string
          created_at: string
          description: string | null
          file_id: string | null
          file_name: string
          file_url: string
          id: string
          kind: string
          student_name: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          batch: string
          course_id: string
          created_at?: string
          description?: string | null
          file_id?: string | null
          file_name: string
          file_url: string
          id?: string
          kind: string
          student_name?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          batch?: string
          course_id?: string
          created_at?: string
          description?: string | null
          file_id?: string | null
          file_name?: string
          file_url?: string
          id?: string
          kind?: string
          student_name?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_uploads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_uploads_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      chapters_public: {
        Row: {
          course_id: string | null
          description: string | null
          id: string | null
          notes_name: string | null
          pdf_name: string | null
          title: string | null
          uploaded_at: string | null
        }
        Insert: {
          course_id?: string | null
          description?: string | null
          id?: string | null
          notes_name?: string | null
          pdf_name?: string | null
          title?: string | null
          uploaded_at?: string | null
        }
        Update: {
          course_id?: string | null
          description?: string | null
          id?: string | null
          notes_name?: string | null
          pdf_name?: string | null
          title?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          roll_number: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          roll_number?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          roll_number?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _test_confirm_rls_user: { Args: { _email: string }; Returns: undefined }
      _test_delete_rls_user: { Args: { _email: string }; Returns: undefined }
      _test_profile_audit_log_scenarios: { Args: never; Returns: Json }
      admin_list_users: {
        Args: never
        Returns: {
          batch: string
          created_at: string
          department: string
          email: string
          full_name: string
          phone_number: string
          role: Database["public"]["Enums"]["app_role"]
          roll_number: string
          section: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      file_visibility: "authenticated" | "private"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      file_visibility: ["authenticated", "private"],
    },
  },
} as const
