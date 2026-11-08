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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_code_files: {
        Row: {
          code_id: string
          file_id: string
        }
        Insert: {
          code_id: string
          file_id: string
        }
        Update: {
          code_id?: string
          file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_code_files_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_code_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      access_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          owner_id: string
          reseller: boolean
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          owner_id?: string
          reseller?: boolean
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          owner_id?: string
          reseller?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      code_purchases: {
        Row: {
          code: string
          code_id: string
          created_at: string
          environment: string
          expires_at: string
          reseller: boolean
          session_id: string
        }
        Insert: {
          code: string
          code_id: string
          created_at?: string
          environment: string
          expires_at: string
          reseller?: boolean
          session_id: string
        }
        Update: {
          code?: string
          code_id?: string
          created_at?: string
          environment?: string
          expires_at?: string
          reseller?: boolean
          session_id?: string
        }
        Relationships: []
      }
      customer_steps: {
        Row: {
          dns: boolean
          files: boolean
          id: boolean
          link: boolean
          warranty: boolean
        }
        Insert: {
          dns?: boolean
          files?: boolean
          id?: boolean
          link?: boolean
          warranty?: boolean
        }
        Update: {
          dns?: boolean
          files?: boolean
          id?: boolean
          link?: boolean
          warranty?: boolean
        }
        Relationships: []
      }
      devices: {
        Row: {
          app_name: string | null
          app_version: string | null
          bundle_id: string | null
          cancelled_at: string | null
          created_at: string
          id: string
          installed_at: string | null
          ios_version: string | null
          ipa_path: string | null
          label: string | null
          product: string | null
          ready_at: string | null
          reseller: boolean
          reseller_id: string | null
          serial: string | null
          token: string
          udid: string
        }
        Insert: {
          app_name?: string | null
          app_version?: string | null
          bundle_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          installed_at?: string | null
          ios_version?: string | null
          ipa_path?: string | null
          label?: string | null
          product?: string | null
          ready_at?: string | null
          reseller?: boolean
          reseller_id?: string | null
          serial?: string | null
          token: string
          udid: string
        }
        Update: {
          app_name?: string | null
          app_version?: string | null
          bundle_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          installed_at?: string | null
          ios_version?: string | null
          ipa_path?: string | null
          label?: string | null
          product?: string | null
          ready_at?: string | null
          reseller?: boolean
          reseller_id?: string | null
          serial?: string | null
          token?: string
          udid?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      download_operators: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          size: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          size?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          size?: number
          storage_path?: string
        }
        Relationships: []
      }
      license_operators: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      reseller_credit_purchases: {
        Row: {
          created_at: string
          credits: number
          reseller_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          credits: number
          reseller_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          reseller_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_credit_purchases_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_links: {
        Row: {
          created_at: string
          expires_at: string
          label: string | null
          reseller_id: string
          short_code: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          label?: string | null
          reseller_id: string
          short_code: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          label?: string | null
          reseller_id?: string
          short_code?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_links_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_sessions: {
        Row: {
          created_at: string
          expires_at: string
          reseller_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          reseller_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          reseller_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_sessions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          access_key_hash: string
          active: boolean
          created_at: string
          credits: number
          id: string
          name: string
          password_hash: string | null
          username: string | null
        }
        Insert: {
          access_key_hash: string
          active?: boolean
          created_at?: string
          credits?: number
          id?: string
          name: string
          password_hash?: string | null
          username?: string | null
        }
        Update: {
          access_key_hash?: string
          active?: boolean
          created_at?: string
          credits?: number
          id?: string
          name?: string
          password_hash?: string | null
          username?: string | null
        }
        Relationships: []
      }
      vcampro_license_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          environment: string
          license_id: string
          plan: string
          session_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          environment: string
          license_id: string
          plan: string
          session_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          environment?: string
          license_id?: string
          plan?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vcampro_license_payments_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "vcampro_licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      vcampro_licenses: {
        Row: {
          code: string
          created_at: string
          customer_label: string
          environment: string
          expires_at: string
          id: string
          owner_id: string
          revoked: boolean
        }
        Insert: {
          code: string
          created_at?: string
          customer_label?: string
          environment: string
          expires_at: string
          id?: string
          owner_id: string
          revoked?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          customer_label?: string
          environment?: string
          expires_at?: string
          id?: string
          owner_id?: string
          revoked?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_reseller_credits: {
        Args: { _qty: number; _reseller: string; _session: string }
        Returns: boolean
      }
      consume_reseller_credit: {
        Args: {
          _expires: string
          _key_hash: string
          _label: string
          _token: string
        }
        Returns: number
      }
      consume_reseller_credit_for:
        | {
            Args: {
              _expires: string
              _label: string
              _reseller: string
              _token: string
            }
            Returns: number
          }
        | {
            Args: {
              _expires: string
              _label: string
              _reseller: string
              _short_code: string
              _token: string
            }
            Returns: number
          }
      fulfill_vcampro_license: {
        Args: {
          p_code: string
          p_env: string
          p_license?: string
          p_plan: string
          p_session: string
        }
        Returns: Json
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
  public: {
    Enums: {},
  },
} as const
