// Matches supabase/schema.sql. The example flag exists only in demo data.
export type PrayerRow = {
  id: string;
  message: string;
  created_at: string;
};

export type PrayerRequest = PrayerRow & { example?: boolean };

export type Database = {
  public: {
    Tables: {
      prayer_requests: {
        Row: PrayerRow;
        Insert: { message: string };
        Update: { message?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
