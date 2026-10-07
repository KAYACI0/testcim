export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      ai_jobs: {
        Row: {
          cost_micro: number | null;
          created_at: string;
          credits_charged: number | null;
          error: string | null;
          id: string;
          input: NonNullable<Json>;
          kind: string;
          model: string | null;
          output: Json | null;
          status: string;
          tokens_in: number | null;
          tokens_out: number | null;
          updated_at: string;
          user_id: string | null;
          workspace_id: string;
        };
        Insert: {
          cost_micro?: number | null;
          created_at?: string;
          credits_charged?: number | null;
          error?: string | null;
          id?: string;
          input?: NonNullable<Json>;
          kind: string;
          model?: string | null;
          output?: Json | null;
          status?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          updated_at?: string;
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          cost_micro?: number | null;
          created_at?: string;
          credits_charged?: number | null;
          error?: string | null;
          id?: string;
          input?: NonNullable<Json>;
          kind?: string;
          model?: string | null;
          output?: Json | null;
          status?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          updated_at?: string;
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_jobs_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      assets: {
        Row: {
          bucket: string;
          bytes: number;
          created_at: string;
          deleted_at: string | null;
          height: number | null;
          id: string;
          kind: string;
          mime: string;
          owner_id: string | null;
          path: string;
          phash: string | null;
          sha256: string | null;
          source: string;
          updated_at: string;
          width: number | null;
          workspace_id: string;
        };
        Insert: {
          bucket: string;
          bytes: number;
          created_at?: string;
          deleted_at?: string | null;
          height?: number | null;
          id?: string;
          kind: string;
          mime: string;
          owner_id?: string | null;
          path: string;
          phash?: string | null;
          sha256?: string | null;
          source: string;
          updated_at?: string;
          width?: number | null;
          workspace_id: string;
        };
        Update: {
          bucket?: string;
          bytes?: number;
          created_at?: string;
          deleted_at?: string | null;
          height?: number | null;
          id?: string;
          kind?: string;
          mime?: string;
          owner_id?: string | null;
          path?: string;
          phash?: string | null;
          sha256?: string | null;
          source?: string;
          updated_at?: string;
          width?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assets_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      attempt_answers: {
        Row: {
          answer: Json | null;
          answered_at: string | null;
          attempt_id: string;
          created_at: string;
          is_correct: boolean | null;
          item_id: string;
          points: number | null;
          time_spent_ms: number | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          answer?: Json | null;
          answered_at?: string | null;
          attempt_id: string;
          created_at?: string;
          is_correct?: boolean | null;
          item_id: string;
          points?: number | null;
          time_spent_ms?: number | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          answer?: Json | null;
          answered_at?: string | null;
          attempt_id?: string;
          created_at?: string;
          is_correct?: boolean | null;
          item_id?: string;
          points?: number | null;
          time_spent_ms?: number | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attempt_answers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'test_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attempt_answers_workspace_id_attempt_id_fkey';
            columns: ['workspace_id', 'attempt_id'];
            isOneToOne: false;
            referencedRelation: 'exam_attempts';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          meta: NonNullable<Json>;
          target_id: string | null;
          target_type: string | null;
          workspace_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          meta?: NonNullable<Json>;
          target_id?: string | null;
          target_type?: string | null;
          workspace_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          meta?: NonNullable<Json>;
          target_id?: string | null;
          target_type?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      billing_events: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          occurred_at: string;
          outcome: string;
          payload: NonNullable<Json>;
          provider: string;
          type: string;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          occurred_at: string;
          outcome?: string;
          payload?: NonNullable<Json>;
          provider: string;
          type: string;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          occurred_at?: string;
          outcome?: string;
          payload?: NonNullable<Json>;
          provider?: string;
          type?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_events_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      billing_invoices: {
        Row: {
          amount_minor: number;
          currency: string;
          document_url: string | null;
          id: string;
          issued_at: string;
          period_end: string | null;
          period_start: string | null;
          provider: string;
          provider_invoice_id: string;
          status: string;
          workspace_id: string;
        };
        Insert: {
          amount_minor: number;
          currency?: string;
          document_url?: string | null;
          id?: string;
          issued_at?: string;
          period_end?: string | null;
          period_start?: string | null;
          provider: string;
          provider_invoice_id: string;
          status: string;
          workspace_id: string;
        };
        Update: {
          amount_minor?: number;
          currency?: string;
          document_url?: string | null;
          id?: string;
          issued_at?: string;
          period_end?: string | null;
          period_start?: string | null;
          provider?: string;
          provider_invoice_id?: string;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_invoices_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      billing_profiles: {
        Row: {
          address: string;
          created_at: string;
          invoice_email: string;
          legal_name: string;
          tax_number: string;
          tax_office: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          address?: string;
          created_at?: string;
          invoice_email?: string;
          legal_name?: string;
          tax_number?: string;
          tax_office?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          address?: string;
          created_at?: string;
          invoice_email?: string;
          legal_name?: string;
          tax_number?: string;
          tax_office?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_profiles_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: true;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      capture_sessions: {
        Row: {
          created_at: string;
          created_by: string | null;
          device_type: string;
          expires_at: string;
          id: string;
          last_active_at: string;
          status: string;
          test_id: string;
          token_hash: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          device_type: string;
          expires_at: string;
          id?: string;
          last_active_at?: string;
          status?: string;
          test_id: string;
          token_hash: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          device_type?: string;
          expires_at?: string;
          id?: string;
          last_active_at?: string;
          status?: string;
          test_id?: string;
          token_hash?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'capture_sessions_test_id_fkey';
            columns: ['test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'capture_sessions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      class_students: {
        Row: {
          class_id: string;
          created_at: string;
          student_id: string;
          workspace_id: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          student_id: string;
          workspace_id: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          student_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_students_workspace_id_class_id_fkey';
            columns: ['workspace_id', 'class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'class_students_workspace_id_student_id_fkey';
            columns: ['workspace_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      classes: {
        Row: {
          archived: boolean;
          created_at: string;
          grade: number | null;
          id: string;
          name: string;
          retention_until: string | null;
          school_year: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived?: boolean;
          created_at?: string;
          grade?: number | null;
          id?: string;
          name: string;
          retention_until?: string | null;
          school_year?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived?: boolean;
          created_at?: string;
          grade?: number | null;
          id?: string;
          name?: string;
          retention_until?: string | null;
          school_year?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'classes_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_mentions: {
        Row: {
          comment_id: string;
          mentioned_user_id: string;
        };
        Insert: {
          comment_id: string;
          mentioned_user_id: string;
        };
        Update: {
          comment_id?: string;
          mentioned_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_mentions_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          resource_id: string;
          resource_type: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resource_id: string;
          resource_type: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resource_id?: string;
          resource_type?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      coupon_redemptions: {
        Row: {
          coupon_code: string;
          id: string;
          redeemed_at: string;
          redeemed_by: string | null;
          workspace_id: string;
        };
        Insert: {
          coupon_code: string;
          id?: string;
          redeemed_at?: string;
          redeemed_by?: string | null;
          workspace_id: string;
        };
        Update: {
          coupon_code?: string;
          id?: string;
          redeemed_at?: string;
          redeemed_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'coupon_redemptions_coupon_code_fkey';
            columns: ['coupon_code'];
            isOneToOne: false;
            referencedRelation: 'coupons';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'coupon_redemptions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          expires_at: string | null;
          is_active: boolean;
          kind: string;
          max_redemptions: number | null;
          plan_id: string | null;
          redeemed_count: number;
          value: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          kind: string;
          max_redemptions?: number | null;
          plan_id?: string | null;
          redeemed_count?: number;
          value: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
          kind?: string;
          max_redemptions?: number | null;
          plan_id?: string | null;
          redeemed_count?: number;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'coupons_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      credit_ledger: {
        Row: {
          created_at: string;
          delta: number;
          id: string;
          reason: string;
          ref_id: string | null;
          ref_type: string | null;
          user_id: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          delta: number;
          id?: string;
          reason: string;
          ref_id?: string | null;
          ref_type?: string | null;
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          delta?: number;
          id?: string;
          reason?: string;
          ref_id?: string | null;
          ref_type?: string | null;
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_ledger_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crop_sessions: {
        Row: {
          created_at: string;
          id: string;
          source_document_id: string;
          state: NonNullable<Json>;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          source_document_id: string;
          state?: NonNullable<Json>;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          source_document_id?: string;
          state?: NonNullable<Json>;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crop_sessions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crop_sessions_workspace_id_source_document_id_fkey';
            columns: ['workspace_id', 'source_document_id'];
            isOneToOne: false;
            referencedRelation: 'source_documents';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      curriculum_outcomes: {
        Row: {
          code: string | null;
          created_at: string;
          description: string;
          grade: number | null;
          id: string;
          subject_id: string;
          topic_id: string | null;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          description: string;
          grade?: number | null;
          id?: string;
          subject_id: string;
          topic_id?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          description?: string;
          grade?: number | null;
          id?: string;
          subject_id?: string;
          topic_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'curriculum_outcomes_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'curriculum_outcomes_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_topics';
            referencedColumns: ['id'];
          },
        ];
      };
      curriculum_subjects: {
        Row: {
          code: string;
          created_at: string;
          grade_from: number | null;
          grade_to: number | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          grade_from?: number | null;
          grade_to?: number | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          grade_from?: number | null;
          grade_to?: number | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      curriculum_topics: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          parent_id: string | null;
          subject_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          parent_id?: string | null;
          subject_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          parent_id?: string | null;
          subject_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'curriculum_topics_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_topics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'curriculum_topics_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      exam_attempts: {
        Row: {
          class_label: string | null;
          created_at: string;
          deadline_at: string | null;
          display_name: string | null;
          flags: NonNullable<Json>;
          id: string;
          ip_hash: string | null;
          max_score: number | null;
          online_exam_id: string;
          score: number | null;
          started_at: string | null;
          status: string;
          student_id: string | null;
          student_no: string | null;
          submitted_at: string | null;
          token_hash: string;
          ua_hash: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          class_label?: string | null;
          created_at?: string;
          deadline_at?: string | null;
          display_name?: string | null;
          flags?: NonNullable<Json>;
          id?: string;
          ip_hash?: string | null;
          max_score?: number | null;
          online_exam_id: string;
          score?: number | null;
          started_at?: string | null;
          status?: string;
          student_id?: string | null;
          student_no?: string | null;
          submitted_at?: string | null;
          token_hash: string;
          ua_hash?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          class_label?: string | null;
          created_at?: string;
          deadline_at?: string | null;
          display_name?: string | null;
          flags?: NonNullable<Json>;
          id?: string;
          ip_hash?: string | null;
          max_score?: number | null;
          online_exam_id?: string;
          score?: number | null;
          started_at?: string | null;
          status?: string;
          student_id?: string | null;
          student_no?: string | null;
          submitted_at?: string | null;
          token_hash?: string;
          ua_hash?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exam_attempts_workspace_id_online_exam_id_fkey';
            columns: ['workspace_id', 'online_exam_id'];
            isOneToOne: false;
            referencedRelation: 'online_exams';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'exam_attempts_workspace_id_student_id_fkey';
            columns: ['workspace_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      exam_rate_limits: {
        Row: {
          bucket_key: string;
          count: number;
          window_start: string;
        };
        Insert: {
          bucket_key: string;
          count?: number;
          window_start: string;
        };
        Update: {
          bucket_key?: string;
          count?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      export_templates: {
        Row: {
          created_at: string;
          header: NonNullable<Json>;
          id: string;
          name: string;
          settings: NonNullable<Json>;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          header?: NonNullable<Json>;
          id?: string;
          name: string;
          settings?: NonNullable<Json>;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          header?: NonNullable<Json>;
          id?: string;
          name?: string;
          settings?: NonNullable<Json>;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'export_templates_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      exports: {
        Row: {
          asset_id: string | null;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          kind: string;
          page_count: number | null;
          params: NonNullable<Json>;
          status: string;
          test_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          asset_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          kind: string;
          page_count?: number | null;
          params?: NonNullable<Json>;
          status?: string;
          test_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          asset_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          kind?: string;
          page_count?: number | null;
          params?: NonNullable<Json>;
          status?: string;
          test_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exports_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exports_workspace_id_test_id_fkey';
            columns: ['workspace_id', 'test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      feedback: {
        Row: {
          body: string;
          context: NonNullable<Json>;
          created_at: string;
          id: string;
          user_id: string | null;
          workspace_id: string;
        };
        Insert: {
          body: string;
          context?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          body?: string;
          context?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      folders: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          name: string;
          parent_id: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          name: string;
          parent_id?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          parent_id?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'folders_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'folders_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      jobs: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          kind: string;
          last_error: string | null;
          payload: NonNullable<Json>;
          run_at: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          kind: string;
          last_error?: string | null;
          payload?: NonNullable<Json>;
          run_at?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          kind?: string;
          last_error?: string | null;
          payload?: NonNullable<Json>;
          run_at?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          payload: NonNullable<Json>;
          read_at: string | null;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      omr_forms: {
        Row: {
          created_at: string;
          id: string;
          template: NonNullable<Json>;
          template_version: number;
          test_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          template: NonNullable<Json>;
          template_version?: number;
          test_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          template?: NonNullable<Json>;
          template_version?: number;
          test_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'omr_forms_workspace_id_test_id_fkey';
            columns: ['workspace_id', 'test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      omr_scans: {
        Row: {
          answers: NonNullable<Json>;
          asset_id: string | null;
          confidence: NonNullable<Json>;
          created_at: string;
          id: string;
          needs_review: boolean;
          reviewed_by: string | null;
          score: number | null;
          session_id: string;
          student_id: string | null;
          student_no_read: string | null;
          updated_at: string;
          version_code: string | null;
          workspace_id: string;
        };
        Insert: {
          answers?: NonNullable<Json>;
          asset_id?: string | null;
          confidence?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          needs_review?: boolean;
          reviewed_by?: string | null;
          score?: number | null;
          session_id: string;
          student_id?: string | null;
          student_no_read?: string | null;
          updated_at?: string;
          version_code?: string | null;
          workspace_id: string;
        };
        Update: {
          answers?: NonNullable<Json>;
          asset_id?: string | null;
          confidence?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          needs_review?: boolean;
          reviewed_by?: string | null;
          score?: number | null;
          session_id?: string;
          student_id?: string | null;
          student_no_read?: string | null;
          updated_at?: string;
          version_code?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'omr_scans_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'omr_scans_workspace_id_session_id_fkey';
            columns: ['workspace_id', 'session_id'];
            isOneToOne: false;
            referencedRelation: 'omr_sessions';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'omr_scans_workspace_id_student_id_fkey';
            columns: ['workspace_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      omr_sessions: {
        Row: {
          class_id: string | null;
          created_at: string;
          id: string;
          status: string;
          test_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          class_id?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          test_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          class_id?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          test_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'omr_sessions_workspace_id_class_id_fkey';
            columns: ['workspace_id', 'class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'omr_sessions_workspace_id_test_id_fkey';
            columns: ['workspace_id', 'test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      online_exam_items: {
        Row: {
          correct_override: Json | null;
          created_at: string;
          group_id: string | null;
          id: string;
          online_exam_id: string;
          points_override: number | null;
          position: string;
          question_id: string;
          question_revision_id: string;
          section_id: string | null;
          test_item_id: string | null;
          workspace_id: string;
        };
        Insert: {
          correct_override?: Json | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          online_exam_id: string;
          points_override?: number | null;
          position: string;
          question_id: string;
          question_revision_id: string;
          section_id?: string | null;
          test_item_id?: string | null;
          workspace_id: string;
        };
        Update: {
          correct_override?: Json | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          online_exam_id?: string;
          points_override?: number | null;
          position?: string;
          question_id?: string;
          question_revision_id?: string;
          section_id?: string | null;
          test_item_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'online_exam_items_workspace_id_online_exam_id_fkey';
            columns: ['workspace_id', 'online_exam_id'];
            isOneToOne: false;
            referencedRelation: 'online_exams';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      online_exams: {
        Row: {
          access: string;
          closes_at: string | null;
          created_at: string;
          duration_sec: number | null;
          id: string;
          join_code: string | null;
          max_attempts: number | null;
          mode: string;
          opens_at: string | null;
          participant_cap: number | null;
          required_fields: NonNullable<Json>;
          show_answers: boolean;
          show_results: string;
          shuffle_options: boolean;
          shuffle_questions: boolean;
          slug: string;
          status: string;
          test_id: string;
          test_snapshot_id: string | null;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          access: string;
          closes_at?: string | null;
          created_at?: string;
          duration_sec?: number | null;
          id?: string;
          join_code?: string | null;
          max_attempts?: number | null;
          mode: string;
          opens_at?: string | null;
          participant_cap?: number | null;
          required_fields?: NonNullable<Json>;
          show_answers?: boolean;
          show_results?: string;
          shuffle_options?: boolean;
          shuffle_questions?: boolean;
          slug: string;
          status?: string;
          test_id: string;
          test_snapshot_id?: string | null;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          access?: string;
          closes_at?: string | null;
          created_at?: string;
          duration_sec?: number | null;
          id?: string;
          join_code?: string | null;
          max_attempts?: number | null;
          mode?: string;
          opens_at?: string | null;
          participant_cap?: number | null;
          required_fields?: NonNullable<Json>;
          show_answers?: boolean;
          show_results?: string;
          shuffle_options?: boolean;
          shuffle_questions?: boolean;
          slug?: string;
          status?: string;
          test_id?: string;
          test_snapshot_id?: string | null;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'online_exams_test_snapshot_id_fkey';
            columns: ['test_snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'test_snapshots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_exams_workspace_id_test_id_fkey';
            columns: ['workspace_id', 'test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      plans: {
        Row: {
          created_at: string;
          currency: string;
          entitlements: NonNullable<Json>;
          id: string;
          is_active: boolean;
          name: string;
          price_monthly_minor: number | null;
          price_yearly_minor: number | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          entitlements?: NonNullable<Json>;
          id: string;
          is_active?: boolean;
          name: string;
          price_monthly_minor?: number | null;
          price_yearly_minor?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          entitlements?: NonNullable<Json>;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_monthly_minor?: number | null;
          price_yearly_minor?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          locale: string;
          onboarding: NonNullable<Json>;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          onboarding?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          onboarding?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [];
      };
      public_submissions: {
        Row: {
          body: string;
          content_url: string | null;
          created_at: string;
          email: string;
          id: string;
          kind: string;
          name: string;
          subject: string;
        };
        Insert: {
          body: string;
          content_url?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          kind: string;
          name: string;
          subject?: string;
        };
        Update: {
          body?: string;
          content_url?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          kind?: string;
          name?: string;
          subject?: string;
        };
        Relationships: [];
      };
      question_outcomes: {
        Row: {
          outcome_id: string;
          question_id: string;
          workspace_id: string;
        };
        Insert: {
          outcome_id: string;
          question_id: string;
          workspace_id: string;
        };
        Update: {
          outcome_id?: string;
          question_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'question_outcomes_outcome_id_fkey';
            columns: ['outcome_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_outcomes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'question_outcomes_workspace_id_question_id_fkey';
            columns: ['workspace_id', 'question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      question_reports: {
        Row: {
          created_at: string;
          id: string;
          question_id: string;
          reason: string;
          reporter_email: string;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          question_id: string;
          reason: string;
          reporter_email: string;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          question_id?: string;
          reason?: string;
          reporter_email?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'question_reports_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      question_revisions: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          question_id: string;
          revision: number;
          snapshot: NonNullable<Json>;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          question_id: string;
          revision: number;
          snapshot: NonNullable<Json>;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          question_id?: string;
          revision?: number;
          snapshot?: NonNullable<Json>;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'question_revisions_workspace_id_question_id_fkey';
            columns: ['workspace_id', 'question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      question_tags: {
        Row: {
          question_id: string;
          tag_id: string;
          workspace_id: string;
        };
        Insert: {
          question_id: string;
          tag_id: string;
          workspace_id: string;
        };
        Update: {
          question_id?: string;
          tag_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'question_tags_workspace_id_question_id_fkey';
            columns: ['workspace_id', 'question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'question_tags_workspace_id_tag_id_fkey';
            columns: ['workspace_id', 'tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      questions: {
        Row: {
          ai_generated: boolean;
          ai_review_status: string | null;
          correct: Json | null;
          created_at: string;
          created_by: string | null;
          current_revision: number;
          deleted_at: string | null;
          difficulty: number | null;
          difficulty_observed: number | null;
          embedding: string | null;
          explanation_asset_id: string | null;
          explanation_rich: Json | null;
          folder_id: string | null;
          id: string;
          kind: string;
          lang: string;
          option_count: number | null;
          options: NonNullable<Json>;
          points: number;
          question_type: string;
          search: unknown;
          source_meta: NonNullable<Json>;
          status: string;
          stem_asset_id: string | null;
          stem_rich: Json | null;
          stem_text: string | null;
          subject_id: string | null;
          thumb_asset_id: string | null;
          topic_id: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          ai_generated?: boolean;
          ai_review_status?: string | null;
          correct?: Json | null;
          created_at?: string;
          created_by?: string | null;
          current_revision?: number;
          deleted_at?: string | null;
          difficulty?: number | null;
          difficulty_observed?: number | null;
          embedding?: string | null;
          explanation_asset_id?: string | null;
          explanation_rich?: Json | null;
          folder_id?: string | null;
          id?: string;
          kind: string;
          lang?: string;
          option_count?: number | null;
          options?: NonNullable<Json>;
          points?: number;
          question_type: string;
          search?: unknown;
          source_meta?: NonNullable<Json>;
          status?: string;
          stem_asset_id?: string | null;
          stem_rich?: Json | null;
          stem_text?: string | null;
          subject_id?: string | null;
          thumb_asset_id?: string | null;
          topic_id?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          ai_generated?: boolean;
          ai_review_status?: string | null;
          correct?: Json | null;
          created_at?: string;
          created_by?: string | null;
          current_revision?: number;
          deleted_at?: string | null;
          difficulty?: number | null;
          difficulty_observed?: number | null;
          embedding?: string | null;
          explanation_asset_id?: string | null;
          explanation_rich?: Json | null;
          folder_id?: string | null;
          id?: string;
          kind?: string;
          lang?: string;
          option_count?: number | null;
          options?: NonNullable<Json>;
          points?: number;
          question_type?: string;
          search?: unknown;
          source_meta?: NonNullable<Json>;
          status?: string;
          stem_asset_id?: string | null;
          stem_rich?: Json | null;
          stem_text?: string | null;
          subject_id?: string | null;
          thumb_asset_id?: string | null;
          topic_id?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_explanation_asset_id_fkey';
            columns: ['explanation_asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_folder_id_fkey';
            columns: ['folder_id'];
            isOneToOne: false;
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_stem_asset_id_fkey';
            columns: ['stem_asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_thumb_asset_id_fkey';
            columns: ['thumb_asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'curriculum_topics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      report_card_summaries: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          class_id: string;
          created_at: string;
          id: string;
          source_report: NonNullable<Json>;
          status: string;
          student_id: string;
          summary_text: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          class_id: string;
          created_at?: string;
          id?: string;
          source_report: NonNullable<Json>;
          status?: string;
          student_id: string;
          summary_text: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          class_id?: string;
          created_at?: string;
          id?: string;
          source_report?: NonNullable<Json>;
          status?: string;
          student_id?: string;
          summary_text?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'report_card_summaries_workspace_id_class_id_fkey';
            columns: ['workspace_id', 'class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'report_card_summaries_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_card_summaries_workspace_id_student_id_fkey';
            columns: ['workspace_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      share_links: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          permissions: NonNullable<Json>;
          resource_id: string;
          resource_type: string;
          token_hash: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          permissions?: NonNullable<Json>;
          resource_id: string;
          resource_type: string;
          token_hash: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          permissions?: NonNullable<Json>;
          resource_id?: string;
          resource_type?: string;
          token_hash?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'share_links_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      source_documents: {
        Row: {
          asset_id: string;
          created_at: string;
          id: string;
          name: string | null;
          page_count: number | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          asset_id: string;
          created_at?: string;
          id?: string;
          name?: string | null;
          page_count?: number | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          asset_id?: string;
          created_at?: string;
          id?: string;
          name?: string | null;
          page_count?: number | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'source_documents_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'source_documents_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      students: {
        Row: {
          archived_at: string | null;
          created_at: string;
          external_ref: string | null;
          full_name: string;
          id: string;
          student_no: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          external_ref?: string | null;
          full_name: string;
          id?: string;
          student_no?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          external_ref?: string | null;
          full_name?: string;
          id?: string;
          student_no?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'students_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          billing_interval: string;
          cancel_at_period_end: boolean;
          coupon_code: string | null;
          created_at: string;
          current_period_end: string | null;
          id: string;
          last_event_at: string | null;
          plan_id: string;
          provider: string;
          provider_ref: string | null;
          seats: number;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          billing_interval?: string;
          cancel_at_period_end?: boolean;
          coupon_code?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          last_event_at?: string | null;
          plan_id: string;
          provider: string;
          provider_ref?: string | null;
          seats?: number;
          status: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          billing_interval?: string;
          cancel_at_period_end?: boolean;
          coupon_code?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          last_event_at?: string | null;
          plan_id?: string;
          provider?: string;
          provider_ref?: string | null;
          seats?: number;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: true;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      tags: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tags_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      test_groups: {
        Row: {
          created_at: string;
          id: string;
          passage_asset_id: string | null;
          passage_rich: Json | null;
          test_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          passage_asset_id?: string | null;
          passage_rich?: Json | null;
          test_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          passage_asset_id?: string | null;
          passage_rich?: Json | null;
          test_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_groups_passage_asset_id_fkey';
            columns: ['passage_asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_groups_workspace_id_test_id_fkey';
            columns: ['workspace_id', 'test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      test_items: {
        Row: {
          correct_override: Json | null;
          created_at: string;
          group_id: string | null;
          id: string;
          pinned: boolean;
          points_override: number | null;
          position: string;
          question_id: string;
          question_revision_id: string;
          section_id: string | null;
          test_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          correct_override?: Json | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          pinned?: boolean;
          points_override?: number | null;
          position: string;
          question_id: string;
          question_revision_id: string;
          section_id?: string | null;
          test_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          correct_override?: Json | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          pinned?: boolean;
          points_override?: number | null;
          position?: string;
          question_id?: string;
          question_revision_id?: string;
          section_id?: string | null;
          test_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_items_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'test_groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_items_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_items_question_revision_id_fkey';
            columns: ['question_revision_id'];
            isOneToOne: false;
            referencedRelation: 'question_revisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_items_section_id_fkey';
            columns: ['section_id'];
            isOneToOne: false;
            referencedRelation: 'test_sections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_items_workspace_id_test_id_fkey';
            columns: ['workspace_id', 'test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      test_sections: {
        Row: {
          created_at: string;
          id: string;
          position: number;
          quota: number | null;
          test_id: string;
          time_limit_sec: number | null;
          title: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          position: number;
          quota?: number | null;
          test_id: string;
          time_limit_sec?: number | null;
          title?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          position?: number;
          quota?: number | null;
          test_id?: string;
          time_limit_sec?: number | null;
          title?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_sections_workspace_id_test_id_fkey';
            columns: ['workspace_id', 'test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      test_snapshots: {
        Row: {
          created_at: string;
          full_state: Json | null;
          id: string;
          reason: string | null;
          revision: number;
          snapshot: NonNullable<Json>;
          test_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          full_state?: Json | null;
          id?: string;
          reason?: string | null;
          revision: number;
          snapshot: NonNullable<Json>;
          test_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          full_state?: Json | null;
          id?: string;
          reason?: string | null;
          revision?: number;
          snapshot?: NonNullable<Json>;
          test_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_snapshots_workspace_id_test_id_fkey';
            columns: ['workspace_id', 'test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      test_versions: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          item_order: NonNullable<Json>;
          option_permutations: NonNullable<Json>;
          seed: number | null;
          test_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          item_order?: NonNullable<Json>;
          option_permutations?: NonNullable<Json>;
          seed?: number | null;
          test_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          item_order?: NonNullable<Json>;
          option_permutations?: NonNullable<Json>;
          seed?: number | null;
          test_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_versions_workspace_id_test_id_fkey';
            columns: ['workspace_id', 'test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      tests: {
        Row: {
          approval_status: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          folder_id: string | null;
          id: string;
          last_exported_at: string | null;
          question_count: number;
          revision: number;
          seed: number | null;
          settings: NonNullable<Json>;
          settings_version: number;
          status: string;
          title: string;
          type: string;
          updated_at: string;
          version_count: number;
          workspace_id: string;
        };
        Insert: {
          approval_status?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          folder_id?: string | null;
          id?: string;
          last_exported_at?: string | null;
          question_count?: number;
          revision?: number;
          seed?: number | null;
          settings?: NonNullable<Json>;
          settings_version?: number;
          status?: string;
          title: string;
          type: string;
          updated_at?: string;
          version_count?: number;
          workspace_id: string;
        };
        Update: {
          approval_status?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          folder_id?: string | null;
          id?: string;
          last_exported_at?: string | null;
          question_count?: number;
          revision?: number;
          seed?: number | null;
          settings?: NonNullable<Json>;
          settings_version?: number;
          status?: string;
          title?: string;
          type?: string;
          updated_at?: string;
          version_count?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tests_folder_id_fkey';
            columns: ['folder_id'];
            isOneToOne: false;
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tests_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      usage_counters: {
        Row: {
          created_at: string;
          metric: string;
          period_start: string;
          updated_at: string;
          value: number;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          metric: string;
          period_start: string;
          updated_at?: string;
          value?: number;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          metric?: string;
          period_start?: string;
          updated_at?: string;
          value?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_counters_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_invites: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          role: string;
          token_hash: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          role: string;
          token_hash: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          role?: string;
          token_hash?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_invites_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_members: {
        Row: {
          created_at: string;
          role: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          role: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspaces: {
        Row: {
          branding: NonNullable<Json>;
          created_at: string;
          deleted_at: string | null;
          id: string;
          kind: string;
          name: string;
          owner_id: string;
          plan_id: string;
          settings: NonNullable<Json>;
          slug: string;
          updated_at: string;
        };
        Insert: {
          branding?: NonNullable<Json>;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          kind: string;
          name: string;
          owner_id: string;
          plan_id?: string;
          settings?: NonNullable<Json>;
          slug: string;
          updated_at?: string;
        };
        Update: {
          branding?: NonNullable<Json>;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          kind?: string;
          name?: string;
          owner_id?: string;
          plan_id?: string;
          settings?: NonNullable<Json>;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspaces_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_billing_event: { Args: { p_event: Json }; Returns: string };
      apply_test_ops: {
        Args: { p_base_revision: number; p_ops: Json; p_test_id: string };
        Returns: Json;
      };
      approve_report_card_summary: {
        Args: { p_id: string; p_workspace_id: string };
        Returns: undefined;
      };
      bulk_delete_students: {
        Args: { p_student_ids: string[]; p_workspace_id: string };
        Returns: undefined;
      };
      bulk_import_students: {
        Args: { p_class_id: string; p_rows: Json; p_workspace_id: string };
        Returns: Json;
      };
      check_exam_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_sec: number };
        Returns: boolean;
      };
      cleanup_expired_class_retention: { Args: Record<PropertyKey, never>; Returns: undefined };
      close_capture_session: { Args: { p_session_id: string }; Returns: boolean };
      close_expired_exams: { Args: Record<PropertyKey, never>; Returns: undefined };
      complete_ai_job: {
        Args: {
          p_cost_micro: number;
          p_credits_charged: number;
          p_job_id: string;
          p_model: string;
          p_output: Json;
          p_tokens_in: number;
          p_tokens_out: number;
        };
        Returns: undefined;
      };
      create_ai_job: { Args: { p_input?: Json; p_kind: string; p_ws: string }; Returns: string };
      expire_subscriptions: { Args: { p_now?: string }; Returns: number };
      fail_ai_job: { Args: { p_error: string; p_job_id: string }; Returns: undefined };
      get_class_report: { Args: { p_class_id: string; p_workspace_id: string }; Returns: Json };
      get_entitlements: { Args: { p_ws: string }; Returns: Json };
      get_outcome_report: {
        Args: { p_class_id: string; p_student_id?: string; p_workspace_id: string };
        Returns: Json;
      };
      get_student_progress: {
        Args: { p_student_id: string; p_workspace_id: string };
        Returns: Json;
      };
      get_weak_topics: { Args: { p_class_id: string; p_workspace_id: string }; Returns: Json };
      has_role: { Args: { roles: string[]; ws: string }; Returns: boolean };
      increment_usage: {
        Args: { p_amount?: number; p_metric: string; p_ws: string };
        Returns: number;
      };
      is_member: { Args: { ws: string }; Returns: boolean };
      link_attempts_to_students: { Args: { p_links: Json; p_workspace_id: string }; Returns: Json };
      notify_comment_mentions: {
        Args: { p_comment_id: string; p_mentioned_user_ids: string[]; p_workspace_id: string };
        Returns: undefined;
      };
      redeem_coupon: { Args: { p_code: string; p_ws: string }; Returns: Json };
      refund_credits: {
        Args: {
          p_amount: number;
          p_reason: string;
          p_ref_id?: string;
          p_ref_type?: string;
          p_ws: string;
        };
        Returns: number;
      };
      renew_monthly_credits: { Args: { p_now?: string; p_ws?: string }; Returns: number };
      require_ai_job_access: {
        Args: { p_job_id: string };
        Returns: {
          cost_micro: number | null;
          created_at: string;
          credits_charged: number | null;
          error: string | null;
          id: string;
          input: NonNullable<Json>;
          kind: string;
          model: string | null;
          output: Json | null;
          status: string;
          tokens_in: number | null;
          tokens_out: number | null;
          updated_at: string;
          user_id: string | null;
          workspace_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'ai_jobs';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      restore_test_snapshot: { Args: { p_revision: number; p_test_id: string }; Returns: Json };
      set_test_approval_status: {
        Args: { p_status: string; p_test_id: string };
        Returns: undefined;
      };
      spend_credits: {
        Args: {
          p_amount: number;
          p_reason: string;
          p_ref_id?: string;
          p_ref_type?: string;
          p_ws: string;
        };
        Returns: number;
      };
      submit_capture_question: {
        Args: {
          p_answer?: string;
          p_asset_path: string;
          p_bytes: number;
          p_height: number;
          p_item_id: string;
          p_mime: string;
          p_phash: string;
          p_position: string;
          p_sha256: string;
          p_token_hash: string;
          p_width: number;
        };
        Returns: {
          asset_id: string;
          current_revision: number;
          error: string;
          item_id: string;
          ok: boolean;
          question_id: string;
          question_revision_id: string;
          test_id: string;
          workspace_id: string;
        }[];
      };
      tr_normalize: { Args: { input: string }; Returns: string };
      validate_capture_session: {
        Args: { p_token_hash: string };
        Returns: {
          device_type: string;
          is_valid: boolean;
          session_id: string;
          test_id: string;
          test_title: string;
          workspace_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
