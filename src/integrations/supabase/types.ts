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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      campaign_enrollments: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          current_step: number
          id: string
          is_paused: boolean
          next_action_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          current_step?: number
          id?: string
          is_paused?: boolean
          next_action_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          current_step?: number
          id?: string
          is_paused?: boolean
          next_action_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_steps: {
        Row: {
          campaign_id: string
          content_goal: string
          created_at: string
          delay_days: number
          id: string
          step_order: number
          subject_hint: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          content_goal: string
          created_at?: string
          delay_days?: number
          id?: string
          step_order: number
          subject_hint?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          content_goal?: string
          created_at?: string
          delay_days?: number
          id?: string
          step_order?: number
          subject_hint?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          ai_summary: string | null
          company_id: string | null
          created_at: string
          deal_value: number | null
          desired_training_date: string | null
          email: string | null
          full_name: string
          group_size: number | null
          id: string
          is_archived: boolean
          job_title: string | null
          last_contact_at: string | null
          last_inbound_at: string | null
          next_step: string | null
          next_step_due: string | null
          next_step_owner: Database["public"]["Enums"]["next_step_owner"]
          notes: string | null
          phone: string | null
          source: string | null
          stage: Database["public"]["Enums"]["crm_stage"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          company_id?: string | null
          created_at?: string
          deal_value?: number | null
          desired_training_date?: string | null
          email?: string | null
          full_name: string
          group_size?: number | null
          id?: string
          is_archived?: boolean
          job_title?: string | null
          last_contact_at?: string | null
          last_inbound_at?: string | null
          next_step?: string | null
          next_step_due?: string | null
          next_step_owner?: Database["public"]["Enums"]["next_step_owner"]
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["crm_stage"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          company_id?: string | null
          created_at?: string
          deal_value?: number | null
          desired_training_date?: string | null
          email?: string | null
          full_name?: string
          group_size?: number | null
          id?: string
          is_archived?: boolean
          job_title?: string | null
          last_contact_at?: string | null
          last_inbound_at?: string | null
          next_step?: string | null
          next_step_due?: string | null
          next_step_owner?: Database["public"]["Enums"]["next_step_owner"]
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["crm_stage"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          ai_model: string
          auto_run_enabled: boolean
          business_context: string
          created_at: string
          drive_folder_id: string | null
          drive_folder_name: string | null
          monthly_token_cap: number
          signature: string | null
          silence_days: number
          todoist_project_id: string | null
          tone_of_voice: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          auto_run_enabled?: boolean
          business_context?: string
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_name?: string | null
          monthly_token_cap?: number
          signature?: string | null
          silence_days?: number
          todoist_project_id?: string | null
          tone_of_voice?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          auto_run_enabled?: boolean
          business_context?: string
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_name?: string | null
          monthly_token_cap?: number
          signature?: string | null
          silence_days?: number
          todoist_project_id?: string | null
          tone_of_voice?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_drafts: {
        Row: {
          body: string
          contact_id: string | null
          created_at: string
          error: string | null
          gmail_draft_id: string | null
          gmail_thread_id: string | null
          id: string
          status: Database["public"]["Enums"]["draft_status"]
          subject: string
          suggestion_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          contact_id?: string | null
          created_at?: string
          error?: string | null
          gmail_draft_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["draft_status"]
          subject: string
          suggestion_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          contact_id?: string | null
          created_at?: string
          error?: string | null
          gmail_draft_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["draft_status"]
          subject?: string
          suggestion_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      run_logs: {
        Row: {
          contacts_analyzed: number
          emails_seen: number
          error: string | null
          finished_at: string | null
          id: string
          notes_seen: number
          started_at: string
          status: string
          suggestions_created: number
          tokens_in: number
          tokens_out: number
          trigger: string
          user_id: string
        }
        Insert: {
          contacts_analyzed?: number
          emails_seen?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          notes_seen?: number
          started_at?: string
          status?: string
          suggestions_created?: number
          tokens_in?: number
          tokens_out?: number
          trigger?: string
          user_id: string
        }
        Update: {
          contacts_analyzed?: number
          emails_seen?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          notes_seen?: number
          started_at?: string
          status?: string
          suggestions_created?: number
          tokens_in?: number
          tokens_out?: number
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          confidence: number | null
          contact_id: string | null
          created_at: string
          draft_body: string | null
          draft_subject: string | null
          from_stage: Database["public"]["Enums"]["crm_stage"] | null
          gmail_thread_id: string | null
          id: string
          proposed_action: string | null
          proposed_due_date: string | null
          reason: string
          resolved_at: string | null
          source_summary: string | null
          status: Database["public"]["Enums"]["suggestion_status"]
          to_stage: Database["public"]["Enums"]["crm_stage"] | null
          type: Database["public"]["Enums"]["suggestion_type"]
          user_id: string
        }
        Insert: {
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          draft_body?: string | null
          draft_subject?: string | null
          from_stage?: Database["public"]["Enums"]["crm_stage"] | null
          gmail_thread_id?: string | null
          id?: string
          proposed_action?: string | null
          proposed_due_date?: string | null
          reason: string
          resolved_at?: string | null
          source_summary?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          to_stage?: Database["public"]["Enums"]["crm_stage"] | null
          type: Database["public"]["Enums"]["suggestion_type"]
          user_id: string
        }
        Update: {
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          draft_body?: string | null
          draft_subject?: string | null
          from_stage?: Database["public"]["Enums"]["crm_stage"] | null
          gmail_thread_id?: string | null
          id?: string
          proposed_action?: string | null
          proposed_due_date?: string | null
          reason?: string
          resolved_at?: string | null
          source_summary?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          to_stage?: Database["public"]["Enums"]["crm_stage"] | null
          type?: Database["public"]["Enums"]["suggestion_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          cursor_value: string | null
          last_run_at: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cursor_value?: string | null
          last_run_at?: string | null
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cursor_value?: string | null
          last_run_at?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          contact_id: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          todoist_task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          todoist_task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          todoist_task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["timeline_kind"]
          occurred_at: string
          processed_at: string | null
          source: string
          source_ref: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["timeline_kind"]
          occurred_at?: string
          processed_at?: string | null
          source?: string
          source_ref?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["timeline_kind"]
          occurred_at?: string
          processed_at?: string | null
          source?: string
          source_ref?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      crm_stage:
        | "new_lead"
        | "contacted"
        | "demo_scheduled"
        | "demo_done"
        | "quote_sent"
        | "scheduling"
        | "training_scheduled"
        | "customer"
        | "repeat_customer"
        | "cold"
      draft_status: "pending" | "created" | "failed" | "discarded"
      next_step_owner: "me" | "them" | "none"
      suggestion_status: "pending" | "approved" | "rejected" | "expired"
      suggestion_type: "stage_change" | "follow_up" | "draft" | "enrich"
      task_status: "open" | "done" | "cancelled"
      timeline_kind:
        | "email_in"
        | "email_out"
        | "note"
        | "meeting"
        | "stage_change"
        | "task"
        | "draft"
        | "system"
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
      crm_stage: [
        "new_lead",
        "contacted",
        "demo_scheduled",
        "demo_done",
        "quote_sent",
        "scheduling",
        "training_scheduled",
        "customer",
        "repeat_customer",
        "cold",
      ],
      draft_status: ["pending", "created", "failed", "discarded"],
      next_step_owner: ["me", "them", "none"],
      suggestion_status: ["pending", "approved", "rejected", "expired"],
      suggestion_type: ["stage_change", "follow_up", "draft", "enrich"],
      task_status: ["open", "done", "cancelled"],
      timeline_kind: [
        "email_in",
        "email_out",
        "note",
        "meeting",
        "stage_change",
        "task",
        "draft",
        "system",
      ],
    },
  },
} as const
