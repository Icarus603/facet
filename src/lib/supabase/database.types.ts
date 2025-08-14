export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          profile: Json | null
          cultural_background: Json | null
          privacy_settings: Json | null
          subscription_tier: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          profile?: Json | null
          cultural_background?: Json | null
          privacy_settings?: Json | null
          subscription_tier?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          profile?: Json | null
          cultural_background?: Json | null
          privacy_settings?: Json | null
          subscription_tier?: string
        }
      }
      user_cultural_profiles: {
        Row: {
          id: string
          user_id: string
          primary_culture: string | null
          secondary_cultures: string[]
          language_preferences: string[]
          religious_spiritual_background: string | null
          generational_status: string | null
          cultural_values: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          primary_culture?: string | null
          secondary_cultures?: string[]
          language_preferences?: string[]
          religious_spiritual_background?: string | null
          generational_status?: string | null
          cultural_values?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          primary_culture?: string | null
          secondary_cultures?: string[]
          language_preferences?: string[]
          religious_spiritual_background?: string | null
          generational_status?: string | null
          cultural_values?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'user' | 'professional' | 'admin' | 'crisis_responder'
    }
  }
}