// Minimal typed slice of the schema for this script only — see
// apps/web/src/lib/supabase/types.ts for why a hand-written stand-in exists
// at all (no generated `database.types.ts` without a running local Supabase).
// Duplicated here rather than imported from apps/web to keep this script
// (and its dependency footprint) independent of the Next.js app.

type Timestamp = string;

export interface CurriculumDatabase {
  public: {
    Tables: {
      curriculum_subjects: {
        Row: {
          id: string;
          code: string;
          name: string;
          grade_from: number | null;
          grade_to: number | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          code: string;
          name: string;
          grade_from?: number | null;
          grade_to?: number | null;
        };
        Update: Partial<CurriculumDatabase['public']['Tables']['curriculum_subjects']['Row']>;
        Relationships: [];
      };
      curriculum_topics: {
        Row: {
          id: string;
          subject_id: string;
          parent_id: string | null;
          name: string;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: { subject_id: string; name: string; parent_id?: string | null };
        Update: Partial<CurriculumDatabase['public']['Tables']['curriculum_topics']['Row']>;
        Relationships: [];
      };
      curriculum_outcomes: {
        Row: {
          id: string;
          subject_id: string;
          topic_id: string | null;
          grade: number | null;
          code: string | null;
          description: string;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          subject_id: string;
          topic_id?: string | null;
          grade?: number | null;
          code?: string | null;
          description: string;
        };
        Update: Partial<CurriculumDatabase['public']['Tables']['curriculum_outcomes']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
