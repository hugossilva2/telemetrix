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
  public: {
    Tables: {
      automation_runs: {
        Row: {
          automation_id: string | null
          created_at: string
          error: string | null
          id: string
          manual: boolean
          ok: boolean
          place_id: string | null
          status_code: number | null
          trigger: string | null
          user_id: string
        }
        Insert: {
          automation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          manual?: boolean
          ok?: boolean
          place_id?: string | null
          status_code?: number | null
          trigger?: string | null
          user_id: string
        }
        Update: {
          automation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          manual?: boolean
          ok?: boolean
          place_id?: string | null
          status_code?: number | null
          trigger?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "place_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_trip_state: {
        Row: {
          device_id: string
          geofence_state: Json
          ignition_on: boolean | null
          last_lat: number | null
          last_lng: number | null
          last_message_at: string | null
          last_mileage: number | null
          max_speed_kmh: number
          mileage_at_start: number | null
          start_lat: number | null
          start_lng: number | null
          start_time: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          device_id: string
          geofence_state?: Json
          ignition_on?: boolean | null
          last_lat?: number | null
          last_lng?: number | null
          last_message_at?: string | null
          last_mileage?: number | null
          max_speed_kmh?: number
          mileage_at_start?: number | null
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          device_id?: string
          geofence_state?: Json
          ignition_on?: boolean | null
          last_lat?: number | null
          last_lng?: number | null
          last_message_at?: string | null
          last_mileage?: number | null
          max_speed_kmh?: number
          mileage_at_start?: number | null
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          license_category: string | null
          license_expires_on: string | null
          license_number: string | null
          name: string
          phone: string | null
          photo_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          license_category?: string | null
          license_expires_on?: string | null
          license_number?: string | null
          name: string
          phone?: string | null
          photo_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          license_category?: string | null
          license_expires_on?: string | null
          license_number?: string | null
          name?: string
          phone?: string | null
          photo_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          driver_id: string | null
          due_date: string | null
          expense_date: string
          file_path: string | null
          fuel_log_id: string | null
          id: string
          notes: string | null
          paid: boolean
          place: string | null
          title: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          driver_id?: string | null
          due_date?: string | null
          expense_date?: string
          file_path?: string | null
          fuel_log_id?: string | null
          id?: string
          notes?: string | null
          paid?: boolean
          place?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          driver_id?: string | null
          due_date?: string | null
          expense_date?: string
          file_path?: string | null
          fuel_log_id?: string | null
          id?: string
          notes?: string | null
          paid?: boolean
          place?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_fuel_log_id_fkey"
            columns: ["fuel_log_id"]
            isOneToOne: false
            referencedRelation: "fuel_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_places: {
        Row: {
          address: string
          created_at: string
          geofence_enabled: boolean
          geofence_radius_m: number
          icon: string
          id: string
          lat: number
          lng: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          geofence_enabled?: boolean
          geofence_radius_m?: number
          icon?: string
          id?: string
          lat: number
          lng: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          geofence_enabled?: boolean
          geofence_radius_m?: number
          icon?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fuel_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          liters_filled: number
          mileage_at_fill: number
          price_per_liter: number
          receipt_url: string | null
          total_cost: number
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          liters_filled: number
          mileage_at_fill: number
          price_per_liter: number
          receipt_url?: string | null
          total_cost: number
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          liters_filled?: number
          mileage_at_fill?: number
          price_per_liter?: number
          receipt_url?: string | null
          total_cost?: number
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          cost: number | null
          created_at: string
          file_path: string | null
          id: string
          interval_km: number | null
          interval_months: number | null
          mileage_at_service: number
          notes: string | null
          service_date: string
          title: string | null
          type: Database["public"]["Enums"]["maintenance_type"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
          workshop: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          file_path?: string | null
          id?: string
          interval_km?: number | null
          interval_months?: number | null
          mileage_at_service?: number
          notes?: string | null
          service_date?: string
          title?: string | null
          type?: Database["public"]["Enums"]["maintenance_type"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
          workshop?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          file_path?: string | null
          id?: string
          interval_km?: number | null
          interval_months?: number | null
          mileage_at_service?: number
          notes?: string | null
          service_date?: string
          title?: string | null
          type?: Database["public"]["Enums"]["maintenance_type"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
          workshop?: string | null
        }
        Relationships: []
      }
      place_automations: {
        Row: {
          body_json: string | null
          cooldown_seconds: number
          created_at: string
          enabled: boolean
          header_name: string | null
          header_value: string | null
          id: string
          label: string | null
          last_fired_at: string | null
          method: string
          place_id: string
          trigger: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          body_json?: string | null
          cooldown_seconds?: number
          created_at?: string
          enabled?: boolean
          header_name?: string | null
          header_value?: string | null
          id?: string
          label?: string | null
          last_fired_at?: string | null
          method?: string
          place_id: string
          trigger: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          body_json?: string | null
          cooldown_seconds?: number
          created_at?: string
          enabled?: boolean
          header_name?: string | null
          header_value?: string | null
          id?: string
          label?: string | null
          last_fired_at?: string | null
          method?: string
          place_id?: string
          trigger?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_automations_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "favorite_places"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      safe_starts: {
        Row: {
          created_at: string
          driver_id: string | null
          id: string
          local_id: number
          min_rpm: number | null
          off_minutes: number | null
          ready: boolean
          ready_at: string | null
          required: boolean
          started_at: string
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          id?: string
          local_id: number
          min_rpm?: number | null
          off_minutes?: number | null
          ready?: boolean
          ready_at?: string | null
          required?: boolean
          started_at: string
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          id?: string
          local_id?: number
          min_rpm?: number | null
          off_minutes?: number | null
          ready?: boolean
          ready_at?: string | null
          required?: boolean
          started_at?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safe_starts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safe_starts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_events: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          metadata: Json | null
          occurred_at: string
          place_id: string | null
          type: Database["public"]["Enums"]["tracker_event_type"]
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          occurred_at?: string
          place_id?: string | null
          type: Database["public"]["Enums"]["tracker_event_type"]
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          occurred_at?: string
          place_id?: string | null
          type?: Database["public"]["Enums"]["tracker_event_type"]
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracker_events_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "favorite_places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracker_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_pings: {
        Row: {
          id: string
          ignition: boolean | null
          lat: number
          lng: number
          recorded_at: string
          speed_kmh: number | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          id?: string
          ignition?: boolean | null
          lat: number
          lng: number
          recorded_at?: string
          speed_kmh?: number | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          id?: string
          ignition?: boolean | null
          lat?: number
          lng?: number
          recorded_at?: string
          speed_kmh?: number | null
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracker_pings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          avg_speed_kmh: number | null
          created_at: string
          distance_km: number | null
          driver_id: string | null
          eco_events: Json
          eco_score: number | null
          end_lat: number | null
          end_lng: number | null
          end_time: string | null
          estimated_cost: number | null
          fuel_liters: number | null
          harsh_accel_count: number
          harsh_brake_count: number
          harsh_corner_count: number
          high_rpm_count: number
          id: string
          idle_seconds: number
          max_speed_kmh: number | null
          mileage_at_end: number | null
          mileage_at_start: number | null
          overspeed_count: number
          start_lat: number | null
          start_lng: number | null
          start_time: string
          user_id: string
          vehicle_id: string | null
          wasted_cost: number | null
          wasted_fuel_liters: number | null
        }
        Insert: {
          avg_speed_kmh?: number | null
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          eco_events?: Json
          eco_score?: number | null
          end_lat?: number | null
          end_lng?: number | null
          end_time?: string | null
          estimated_cost?: number | null
          fuel_liters?: number | null
          harsh_accel_count?: number
          harsh_brake_count?: number
          harsh_corner_count?: number
          high_rpm_count?: number
          id?: string
          idle_seconds?: number
          max_speed_kmh?: number | null
          mileage_at_end?: number | null
          mileage_at_start?: number | null
          overspeed_count?: number
          start_lat?: number | null
          start_lng?: number | null
          start_time: string
          user_id: string
          vehicle_id?: string | null
          wasted_cost?: number | null
          wasted_fuel_liters?: number | null
        }
        Update: {
          avg_speed_kmh?: number | null
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          eco_events?: Json
          eco_score?: number | null
          end_lat?: number | null
          end_lng?: number | null
          end_time?: string | null
          estimated_cost?: number | null
          fuel_liters?: number | null
          harsh_accel_count?: number
          harsh_brake_count?: number
          harsh_corner_count?: number
          high_rpm_count?: number
          id?: string
          idle_seconds?: number
          max_speed_kmh?: number | null
          mileage_at_end?: number | null
          mileage_at_start?: number | null
          overspeed_count?: number
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string
          user_id?: string
          vehicle_id?: string | null
          wasted_cost?: number | null
          wasted_fuel_liters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          amount: number | null
          created_at: string
          expires_on: string | null
          file_path: string | null
          id: string
          issuer: string | null
          notes: string | null
          number: string | null
          title: string | null
          type: Database["public"]["Enums"]["vehicle_document_type"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          expires_on?: string | null
          file_path?: string | null
          id?: string
          issuer?: string | null
          notes?: string | null
          number?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["vehicle_document_type"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          expires_on?: string | null
          file_path?: string | null
          id?: string
          issuer?: string | null
          notes?: string | null
          number?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["vehicle_document_type"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          alert_engine_on: boolean
          alert_geofence: boolean
          alert_ignition: boolean
          alert_motion_off: boolean
          alert_signal_lost: boolean
          avg_consumption_kmpl: number
          created_at: string
          current_mileage: number
          flespi_device_id: string | null
          id: string
          name: string
          plate: string
          signal_lost_notified_at: string | null
          tracker_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_engine_on?: boolean
          alert_geofence?: boolean
          alert_ignition?: boolean
          alert_motion_off?: boolean
          alert_signal_lost?: boolean
          avg_consumption_kmpl?: number
          created_at?: string
          current_mileage?: number
          flespi_device_id?: string | null
          id?: string
          name: string
          plate: string
          signal_lost_notified_at?: string | null
          tracker_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_engine_on?: boolean
          alert_geofence?: boolean
          alert_ignition?: boolean
          alert_motion_off?: boolean
          alert_signal_lost?: boolean
          avg_consumption_kmpl?: number
          created_at?: string
          current_mileage?: number
          flespi_device_id?: string | null
          id?: string
          name?: string
          plate?: string
          signal_lost_notified_at?: string | null
          tracker_mode?: boolean
          updated_at?: string
          user_id?: string
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
      expense_category:
        | "pedagio"
        | "estacionamento"
        | "lavagem"
        | "multa"
        | "seguro"
        | "manutencao"
        | "financiamento"
        | "acessorio"
        | "outro"
        | "combustivel"
      maintenance_type:
        | "oleo"
        | "filtro_oleo"
        | "filtro_ar"
        | "filtro_combustivel"
        | "correia"
        | "pneus"
        | "freios"
        | "velas"
        | "revisao"
        | "outro"
      tracker_event_type:
        | "ignition_on"
        | "ignition_off"
        | "motion_off_ignition"
        | "geofence_exit"
        | "signal_lost"
        | "geofence_enter"
      vehicle_document_type:
        | "crlv"
        | "seguro"
        | "ipva"
        | "licenciamento"
        | "inspecao"
        | "outro"
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
      expense_category: [
        "pedagio",
        "estacionamento",
        "lavagem",
        "multa",
        "seguro",
        "manutencao",
        "financiamento",
        "acessorio",
        "outro",
        "combustivel",
      ],
      maintenance_type: [
        "oleo",
        "filtro_oleo",
        "filtro_ar",
        "filtro_combustivel",
        "correia",
        "pneus",
        "freios",
        "velas",
        "revisao",
        "outro",
      ],
      tracker_event_type: [
        "ignition_on",
        "ignition_off",
        "motion_off_ignition",
        "geofence_exit",
        "signal_lost",
        "geofence_enter",
      ],
      vehicle_document_type: [
        "crlv",
        "seguro",
        "ipva",
        "licenciamento",
        "inspecao",
        "outro",
      ],
    },
  },
} as const
