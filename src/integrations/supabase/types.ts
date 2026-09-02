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
          accum_distance_km: number
          device_id: string
          geofence_state: Json
          ignition_on: boolean | null
          ingest_lease_until: string | null
          last_lat: number | null
          last_lng: number | null
          last_message_at: string | null
          last_mileage: number | null
          last_ping_at: string | null
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
          accum_distance_km?: number
          device_id: string
          geofence_state?: Json
          ignition_on?: boolean | null
          ingest_lease_until?: string | null
          last_lat?: number | null
          last_lng?: number | null
          last_message_at?: string | null
          last_mileage?: number | null
          last_ping_at?: string | null
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
          accum_distance_km?: number
          device_id?: string
          geofence_state?: Json
          ignition_on?: boolean | null
          ingest_lease_until?: string | null
          last_lat?: number | null
          last_lng?: number | null
          last_message_at?: string | null
          last_mileage?: number | null
          last_ping_at?: string | null
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
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          mode: Database["public"]["Enums"]["account_mode"]
          onboarded_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          mode?: Database["public"]["Enums"]["account_mode"]
          onboarded_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          mode?: Database["public"]["Enums"]["account_mode"]
          onboarded_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      rides: {
        Row: {
          amount: number
          created_at: string
          distance_km: number | null
          duration_min: number | null
          id: string
          notes: string | null
          occurred_at: string
          platform: Database["public"]["Enums"]["ride_platform"]
          shift_id: string | null
          tip: number
          trip_id: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          distance_km?: number | null
          duration_min?: number | null
          id?: string
          notes?: string | null
          occurred_at?: string
          platform?: Database["public"]["Enums"]["ride_platform"]
          shift_id?: string | null
          tip?: number
          trip_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          distance_km?: number | null
          duration_min?: number | null
          id?: string
          notes?: string | null
          occurred_at?: string
          platform?: Database["public"]["Enums"]["ride_platform"]
          shift_id?: string | null
          tip?: number
          trip_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
      shifts: {
        Row: {
          created_at: string
          end_mileage: number | null
          ended_at: string | null
          id: string
          notes: string | null
          start_mileage: number | null
          started_at: string
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          end_mileage?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          start_mileage?: number | null
          started_at?: string
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          end_mileage?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          start_mileage?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_vehicle_id_fkey"
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
      trip_coachings: {
        Row: {
          comparison: string | null
          created_at: string
          grade: string
          headline: string
          highlight: string | null
          id: string
          model: string | null
          summary: string
          tips: Json
          trip_id: string
          user_id: string
        }
        Insert: {
          comparison?: string | null
          created_at?: string
          grade: string
          headline: string
          highlight?: string | null
          id?: string
          model?: string | null
          summary: string
          tips?: Json
          trip_id: string
          user_id: string
        }
        Update: {
          comparison?: string | null
          created_at?: string
          grade?: string
          headline?: string
          highlight?: string | null
          id?: string
          model?: string | null
          summary?: string
          tips?: Json
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_coachings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
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
          hardware_source: string
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
          route_data: Json | null
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
          hardware_source?: string
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
          route_data?: Json | null
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
          hardware_source?: string
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
          route_data?: Json | null
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
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database["public"]["Enums"]["app_plan"]
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["app_plan"]
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["app_plan"]
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_checkups: {
        Row: {
          checked_at: string
          created_at: string
          driver_id: string | null
          id: string
          item: string
          mileage_km: number | null
          notes: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          checked_at?: string
          created_at?: string
          driver_id?: string | null
          id?: string
          item: string
          mileage_km?: number | null
          notes?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          checked_at?: string
          created_at?: string
          driver_id?: string | null
          id?: string
          item?: string
          mileage_km?: number | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_checkups_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checkups_vehicle_id_fkey"
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
      vehicle_shares: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_email: string
          label: string | null
          owner_id: string
          revoked_at: string | null
          updated_at: string
          vehicle_id: string
          viewer_last_seen_at: string | null
          viewer_user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_email: string
          label?: string | null
          owner_id: string
          revoked_at?: string | null
          updated_at?: string
          vehicle_id: string
          viewer_last_seen_at?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_email?: string
          label?: string | null
          owner_id?: string
          revoked_at?: string | null
          updated_at?: string
          vehicle_id?: string
          viewer_last_seen_at?: string | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_shares_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          alert_engine_on: boolean
          alert_geofence: boolean
          alert_ignition: boolean
          alert_motion_off: boolean
          alert_signal_lost: boolean
          avg_consumption_kmpl: number
          consumption_ethanol_highway: number
          consumption_ethanol_urban: number
          consumption_gasoline_highway: number
          consumption_gasoline_urban: number
          created_at: string
          current_mileage: number
          eco_rpm_max: number
          eco_rpm_min: number
          engine: string | null
          flespi_device_id: string | null
          fuel_kind: string
          gearbox: string | null
          id: string
          model_year: number | null
          name: string
          obd_device_id: string | null
          obd_device_name: string | null
          obd_first_paired_at: string | null
          plate: string
          signal_lost_notified_at: string | null
          tank_l: number
          tracker_mode: boolean
          updated_at: string
          user_id: string
          zero_to_100_s: number
        }
        Insert: {
          alert_engine_on?: boolean
          alert_geofence?: boolean
          alert_ignition?: boolean
          alert_motion_off?: boolean
          alert_signal_lost?: boolean
          avg_consumption_kmpl?: number
          consumption_ethanol_highway?: number
          consumption_ethanol_urban?: number
          consumption_gasoline_highway?: number
          consumption_gasoline_urban?: number
          created_at?: string
          current_mileage?: number
          eco_rpm_max?: number
          eco_rpm_min?: number
          engine?: string | null
          flespi_device_id?: string | null
          fuel_kind?: string
          gearbox?: string | null
          id?: string
          model_year?: number | null
          name: string
          obd_device_id?: string | null
          obd_device_name?: string | null
          obd_first_paired_at?: string | null
          plate: string
          signal_lost_notified_at?: string | null
          tank_l?: number
          tracker_mode?: boolean
          updated_at?: string
          user_id: string
          zero_to_100_s?: number
        }
        Update: {
          alert_engine_on?: boolean
          alert_geofence?: boolean
          alert_ignition?: boolean
          alert_motion_off?: boolean
          alert_signal_lost?: boolean
          avg_consumption_kmpl?: number
          consumption_ethanol_highway?: number
          consumption_ethanol_urban?: number
          consumption_gasoline_highway?: number
          consumption_gasoline_urban?: number
          created_at?: string
          current_mileage?: number
          eco_rpm_max?: number
          eco_rpm_min?: number
          engine?: string | null
          flespi_device_id?: string | null
          fuel_kind?: string
          gearbox?: string | null
          id?: string
          model_year?: number | null
          name?: string
          obd_device_id?: string | null
          obd_device_name?: string | null
          obd_first_paired_at?: string | null
          plate?: string
          signal_lost_notified_at?: string | null
          tank_l?: number
          tracker_mode?: boolean
          updated_at?: string
          user_id?: string
          zero_to_100_s?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_vehicle_share: { Args: { _share_id: string }; Returns: boolean }
      can_view_vehicle: { Args: { _vehicle_id: string }; Returns: boolean }
      current_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_plan"]
      }
      touch_vehicle_share_seen: {
        Args: { _share_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_mode: "motorista" | "app" | "instrutor" | "autoescola"
      app_plan: "free" | "pro" | "frota"
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
      ride_platform: "uber" | "99" | "indrive" | "outra"
      subscription_status: "active" | "trialing" | "canceled" | "past_due"
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
      account_mode: ["motorista", "app", "instrutor", "autoescola"],
      app_plan: ["free", "pro", "frota"],
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
      ride_platform: ["uber", "99", "indrive", "outra"],
      subscription_status: ["active", "trialing", "canceled", "past_due"],
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
