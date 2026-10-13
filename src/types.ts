// Matches supabase/schema.sql. The example flag exists only in demo data.
export type PrayerRow = {
  id: string;
  message: string;
  name: string | null;
  created_at: string;
  event_id: string | null;
  event_name: string | null;
};
export type FellowshipEvent = { id: string; title: string; event_date: string; is_current: boolean };

// Older browser-only demo entries may not have a name field.
export type PrayerRequest = Omit<PrayerRow, 'name' | 'event_id' | 'event_name'> & { name?: string | null; event_id?: string | null; event_name?: string | null; example?: boolean };

export type Database = {
  public: {
    Tables: {
      event_admins: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
        Relationships: [];
      };
      prayer_requests: {
        Row: PrayerRow;
        Insert: { message: string; name?: string | null; event_id?: string | null; event_name?: string | null };
        Update: { message?: string; name?: string | null; event_id?: string | null; event_name?: string | null };
        Relationships: [];
      };
      fellowship_events: {
        Row: FellowshipEvent;
        Insert: { title: string; event_date: string; is_current?: boolean };
        Update: { title?: string; event_date?: string; is_current?: boolean };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      save_fellowship_event: {
        Args: { p_id: string | null; p_title: string; p_date: string; p_current: boolean };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
