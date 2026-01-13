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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      connected_accounts: {
        Row: {
          access_token: string
          account_name: string | null
          account_username: string | null
          created_at: string | null
          id: string
          profile_picture_url: string | null
          provider: string
          provider_account_id: string
          timezone: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          account_name?: string | null
          account_username?: string | null
          created_at?: string | null
          id?: string
          profile_picture_url?: string | null
          provider?: string
          provider_account_id: string
          timezone?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          account_name?: string | null
          account_username?: string | null
          created_at?: string | null
          id?: string
          profile_picture_url?: string | null
          provider?: string
          provider_account_id?: string
          timezone?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      instagram_cache_metadata: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_syncing: boolean | null
          last_insights_sync: string | null
          last_posts_sync: string | null
          last_profile_sync: string | null
          last_sync_error: string | null
          newest_post_date: string | null
          oldest_post_date: string | null
          total_insights_days: number | null
          total_posts_cached: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_syncing?: boolean | null
          last_insights_sync?: string | null
          last_posts_sync?: string | null
          last_profile_sync?: string | null
          last_sync_error?: string | null
          newest_post_date?: string | null
          oldest_post_date?: string | null
          total_insights_days?: number | null
          total_posts_cached?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_syncing?: boolean | null
          last_insights_sync?: string | null
          last_posts_sync?: string | null
          last_profile_sync?: string | null
          last_sync_error?: string | null
          newest_post_date?: string | null
          oldest_post_date?: string | null
          total_insights_days?: number | null
          total_posts_cached?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_cache_metadata_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_daily_insights: {
        Row: {
          account_id: string
          accounts_engaged: number | null
          created_at: string
          email_contacts: number | null
          follower_count: number | null
          get_directions_clicks: number | null
          id: string
          impressions: number | null
          insight_date: string
          phone_call_clicks: number | null
          profile_views: number | null
          reach: number | null
          text_message_clicks: number | null
          updated_at: string
          website_clicks: number | null
        }
        Insert: {
          account_id: string
          accounts_engaged?: number | null
          created_at?: string
          email_contacts?: number | null
          follower_count?: number | null
          get_directions_clicks?: number | null
          id?: string
          impressions?: number | null
          insight_date: string
          phone_call_clicks?: number | null
          profile_views?: number | null
          reach?: number | null
          text_message_clicks?: number | null
          updated_at?: string
          website_clicks?: number | null
        }
        Update: {
          account_id?: string
          accounts_engaged?: number | null
          created_at?: string
          email_contacts?: number | null
          follower_count?: number | null
          get_directions_clicks?: number | null
          id?: string
          impressions?: number | null
          insight_date?: string
          phone_call_clicks?: number | null
          profile_views?: number | null
          reach?: number | null
          text_message_clicks?: number | null
          updated_at?: string
          website_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_daily_insights_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_posts_cache: {
        Row: {
          account_id: string
          caption: string | null
          comments_count: number | null
          computed_raw: Json | null
          created_at: string
          engagement: number | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          insights_raw: Json | null
          last_fetched_at: string | null
          like_count: number | null
          media_id: string
          media_product_type: string | null
          media_type: string | null
          media_url: string | null
          permalink: string | null
          plays: number | null
          reach: number | null
          saved: number | null
          thumbnail_url: string | null
          timestamp: string
          updated_at: string
          video_views: number | null
        }
        Insert: {
          account_id: string
          caption?: string | null
          comments_count?: number | null
          computed_raw?: Json | null
          created_at?: string
          engagement?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          insights_raw?: Json | null
          last_fetched_at?: string | null
          like_count?: number | null
          media_id: string
          media_product_type?: string | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          plays?: number | null
          reach?: number | null
          saved?: number | null
          thumbnail_url?: string | null
          timestamp: string
          updated_at?: string
          video_views?: number | null
        }
        Update: {
          account_id?: string
          caption?: string | null
          comments_count?: number | null
          computed_raw?: Json | null
          created_at?: string
          engagement?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          insights_raw?: Json | null
          last_fetched_at?: string | null
          like_count?: number | null
          media_id?: string
          media_product_type?: string | null
          media_type?: string | null
          media_url?: string | null
          permalink?: string | null
          plays?: number | null
          reach?: number | null
          saved?: number | null
          thumbnail_url?: string | null
          timestamp?: string
          updated_at?: string
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_cache_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_profile_snapshots: {
        Row: {
          account_id: string
          biography: string | null
          business_id: string
          created_at: string
          followers_count: number | null
          follows_count: number | null
          id: string
          media_count: number | null
          name: string | null
          profile_picture_url: string | null
          snapshot_date: string
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          account_id: string
          biography?: string | null
          business_id: string
          created_at?: string
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          media_count?: number | null
          name?: string | null
          profile_picture_url?: string | null
          snapshot_date: string
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          account_id?: string
          biography?: string | null
          business_id?: string
          created_at?: string
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          media_count?: number | null
          name?: string | null
          profile_picture_url?: string | null
          snapshot_date?: string
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_profile_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
