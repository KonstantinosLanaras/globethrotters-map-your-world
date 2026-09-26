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
      catalog_cities: {
        Row: {
          country: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          is_launch_city: boolean
          latitude: number
          longitude: number
          market_rank: number | null
          name: string
          search_radius_km: number
          slug: string
          updated_at: string
        }
        Insert: {
          country: string
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_launch_city?: boolean
          latitude: number
          longitude: number
          market_rank?: number | null
          name: string
          search_radius_km?: number
          slug: string
          updated_at?: string
        }
        Update: {
          country?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_launch_city?: boolean
          latitude?: number
          longitude?: number
          market_rank?: number | null
          name?: string
          search_radius_km?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_import_runs: {
        Row: {
          candidate_count: number
          completed_at: string | null
          error_message: string | null
          id: string
          provider: string
          request_count: number
          selected_count: number
          started_at: string
          status: string
        }
        Insert: {
          candidate_count?: number
          completed_at?: string | null
          error_message?: string | null
          id?: string
          provider: string
          request_count?: number
          selected_count?: number
          started_at?: string
          status?: string
        }
        Update: {
          candidate_count?: number
          completed_at?: string | null
          error_message?: string | null
          id?: string
          provider?: string
          request_count?: number
          selected_count?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          canonical_category: string
          city_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_verified_at: string | null
          latitude: number
          longitude: number
          metadata: Json
          name: string
          published_at: string
          quality_tier: string
          selection_rank: number | null
          source: string
          source_confidence: number | null
          source_id: string
          source_url: string | null
          subcategory: string
          updated_at: string
        }
        Insert: {
          canonical_category: string
          city_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          latitude: number
          longitude: number
          metadata?: Json
          name: string
          published_at?: string
          quality_tier?: string
          selection_rank?: number | null
          source: string
          source_confidence?: number | null
          source_id: string
          source_url?: string | null
          subcategory: string
          updated_at?: string
        }
        Update: {
          canonical_category?: string
          city_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          latitude?: number
          longitude?: number
          metadata?: Json
          name?: string
          published_at?: string
          quality_tier?: string
          selection_rank?: number | null
          source?: string
          source_confidence?: number | null
          source_id?: string
          source_url?: string | null
          subcategory?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "catalog_cities"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_source_refs: {
        Row: {
          catalog_item_id: string
          external_id: string
          id: string
          last_checked_at: string | null
          matched_at: string
          provider: string
          selection_rank: number | null
        }
        Insert: {
          catalog_item_id: string
          external_id: string
          id?: string
          last_checked_at?: string | null
          matched_at?: string
          provider: string
          selection_rank?: number | null
        }
        Update: {
          catalog_item_id?: string
          external_id?: string
          id?: string
          last_checked_at?: string | null
          matched_at?: string
          provider?: string
          selection_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_source_refs_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_impacts: {
        Row: {
          created_at: string
          experience_id: string | null
          id: string
          impact_type: string
          place_id: string | null
          points: number
          source_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_id?: string | null
          id?: string
          impact_type: string
          place_id?: string | null
          points?: number
          source_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          experience_id?: string | null
          id?: string
          impact_type?: string
          place_id?: string | null
          points?: number
          source_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_impacts_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_impacts_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          participant_one: string
          participant_two: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_one: string
          participant_two: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_one?: string
          participant_two?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      destination_activities: {
        Row: {
          activities: Json
          country: string
          created_at: string
          id: string
          place_name: string
          updated_at: string
        }
        Insert: {
          activities?: Json
          country: string
          created_at?: string
          id?: string
          place_name: string
          updated_at?: string
        }
        Update: {
          activities?: Json
          country?: string
          created_at?: string
          id?: string
          place_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      experience_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          experience_id: string
          id: string
          thumbnail_url: string | null
          title: string | null
          url: string
        }
        Insert: {
          attachment_type?: string
          created_at?: string
          experience_id: string
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          url: string
        }
        Update: {
          attachment_type?: string
          created_at?: string
          experience_id?: string
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_attachments_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_reviews: {
        Row: {
          comment: string | null
          created_at: string
          experience_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          experience_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          experience_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_reviews_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_saves: {
        Row: {
          created_at: string
          experience_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          experience_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_saves_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          caption: string | null
          category: string
          city: string | null
          clicks_count: number
          country: string | null
          created_at: string
          engagement_score: number
          experience_date: string | null
          helpful_count: number
          id: string
          is_seeded: boolean
          is_sponsored: boolean
          lat: number | null
          lng: number | null
          rating: number | null
          rating_avg: number
          review_count: number
          saves_count: number
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          caption?: string | null
          category?: string
          city?: string | null
          clicks_count?: number
          country?: string | null
          created_at?: string
          engagement_score?: number
          experience_date?: string | null
          helpful_count?: number
          id?: string
          is_seeded?: boolean
          is_sponsored?: boolean
          lat?: number | null
          lng?: number | null
          rating?: number | null
          rating_avg?: number
          review_count?: number
          saves_count?: number
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          caption?: string | null
          category?: string
          city?: string | null
          clicks_count?: number
          country?: string | null
          created_at?: string
          engagement_score?: number
          experience_date?: string | null
          helpful_count?: number
          id?: string
          is_seeded?: boolean
          is_sponsored?: boolean
          lat?: number | null
          lng?: number | null
          rating?: number | null
          rating_avg?: number
          review_count?: number
          saves_count?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      favorite_experiences: {
        Row: {
          created_at: string
          experience_id: string
          id: string
          publish_note: string | null
          publish_status: string
          published_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_id: string
          id?: string
          publish_note?: string | null
          publish_status?: string
          published_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          experience_id?: string
          id?: string
          publish_note?: string | null
          publish_status?: string
          published_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_experiences_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_journeys: {
        Row: {
          created_at: string
          id: string
          journey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journey_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_journeys_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          is_close_friend: boolean
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          is_close_friend?: boolean
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          is_close_friend?: boolean
          status?: string
        }
        Relationships: []
      }
      google_place_candidate_ids: {
        Row: {
          city_id: string
          fetched_at: string
          google_place_id: string
          id: string
          import_run_id: string
          search_category: string
          selection_rank: number
        }
        Insert: {
          city_id: string
          fetched_at?: string
          google_place_id: string
          id?: string
          import_run_id: string
          search_category: string
          selection_rank: number
        }
        Update: {
          city_id?: string
          fetched_at?: string
          google_place_id?: string
          id?: string
          import_run_id?: string
          search_category?: string
          selection_rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "google_place_candidate_ids_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "catalog_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_place_candidate_ids_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "catalog_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      helpful_marks: {
        Row: {
          created_at: string
          experience_id: string
          id: string
          mark_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_id: string
          id?: string
          mark_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          experience_id?: string
          id?: string
          mark_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpful_marks_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_experiences: {
        Row: {
          added_at: string
          catalog_item_id: string | null
          experience_id: string | null
          id: string
          journey_id: string
        }
        Insert: {
          added_at?: string
          catalog_item_id?: string | null
          experience_id?: string | null
          id?: string
          journey_id: string
        }
        Update: {
          added_at?: string
          catalog_item_id?: string | null
          experience_id?: string | null
          id?: string
          journey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_experiences_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_experiences_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_experiences_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_join_requests: {
        Row: {
          created_at: string
          id: string
          journey_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journey_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journey_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_join_requests_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          journey_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          journey_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          journey_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_members_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          conversation_id: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          destinations: string[]
          emoji: string | null
          end_date: string | null
          id: string
          open_to_join: boolean
          privacy: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          destinations?: string[]
          emoji?: string | null
          end_date?: string | null
          id?: string
          open_to_join?: boolean
          privacy?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          destinations?: string[]
          emoji?: string | null
          end_date?: string | null
          id?: string
          open_to_join?: boolean
          privacy?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journeys_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      list_places: {
        Row: {
          added_at: string
          id: string
          list_id: string
          place_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          list_id: string
          place_id: string
        }
        Update: {
          added_at?: string
          id?: string
          list_id?: string
          place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_places_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          place_id: string
          url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          place_id: string
          url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          place_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_ratings: {
        Row: {
          accessibility_rating: number | null
          atmosphere_rating: number | null
          authenticity_rating: number | null
          best_months: string[] | null
          category: string
          comment: string | null
          created_at: string
          crowd_level: string | null
          crowd_rating: number | null
          culture_score: number | null
          difficulty_rating: number | null
          english_rating: number | null
          family_rating: number | null
          food_quality_rating: number | null
          food_score: number | null
          hiking_score: number | null
          id: string
          nature_score: number | null
          nightlife_score: number | null
          overall_rating: number
          place_id: string
          safety_rating: number | null
          scenery_rating: number | null
          selected_interests: string[] | null
          tags: string[] | null
          transport_rating: number | null
          updated_at: string
          user_id: string
          value_rating: number | null
          worth_it_rating: number | null
        }
        Insert: {
          accessibility_rating?: number | null
          atmosphere_rating?: number | null
          authenticity_rating?: number | null
          best_months?: string[] | null
          category?: string
          comment?: string | null
          created_at?: string
          crowd_level?: string | null
          crowd_rating?: number | null
          culture_score?: number | null
          difficulty_rating?: number | null
          english_rating?: number | null
          family_rating?: number | null
          food_quality_rating?: number | null
          food_score?: number | null
          hiking_score?: number | null
          id?: string
          nature_score?: number | null
          nightlife_score?: number | null
          overall_rating: number
          place_id: string
          safety_rating?: number | null
          scenery_rating?: number | null
          selected_interests?: string[] | null
          tags?: string[] | null
          transport_rating?: number | null
          updated_at?: string
          user_id: string
          value_rating?: number | null
          worth_it_rating?: number | null
        }
        Update: {
          accessibility_rating?: number | null
          atmosphere_rating?: number | null
          authenticity_rating?: number | null
          best_months?: string[] | null
          category?: string
          comment?: string | null
          created_at?: string
          crowd_level?: string | null
          crowd_rating?: number | null
          culture_score?: number | null
          difficulty_rating?: number | null
          english_rating?: number | null
          family_rating?: number | null
          food_quality_rating?: number | null
          food_score?: number | null
          hiking_score?: number | null
          id?: string
          nature_score?: number | null
          nightlife_score?: number | null
          overall_rating?: number
          place_id?: string
          safety_rating?: number | null
          scenery_rating?: number | null
          selected_interests?: string[] | null
          tags?: string[] | null
          transport_rating?: number | null
          updated_at?: string
          user_id?: string
          value_rating?: number | null
          worth_it_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "place_ratings_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          catalog_item_id: string | null
          city: string | null
          country: string
          created_at: string
          date_visited: string | null
          id: string
          lat: number
          lng: number
          name: string
          notes: string | null
          rating: number | null
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          catalog_item_id?: string | null
          city?: string | null
          country?: string
          created_at?: string
          date_visited?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          notes?: string | null
          rating?: number | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          catalog_item_id?: string | null
          city?: string | null
          country?: string
          created_at?: string
          date_visited?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          notes?: string | null
          rating?: number | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contribution_count: number
          created_at: string
          display_name: string | null
          dream_destinations: string[] | null
          home_base: string | null
          id: string
          interests: string[] | null
          is_verified: boolean
          languages: string[] | null
          marketing_consent_at: string | null
          marketing_consent_version: string | null
          marketing_opt_in: boolean
          next_trip: string | null
          personality: string | null
          privacy: string
          signup_source: string
          travel_style: string[] | null
          travelers_helped: number
          trust_score: number
          updated_at: string
          user_id: string
          username: string | null
          validated_score: number
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contribution_count?: number
          created_at?: string
          display_name?: string | null
          dream_destinations?: string[] | null
          home_base?: string | null
          id?: string
          interests?: string[] | null
          is_verified?: boolean
          languages?: string[] | null
          marketing_consent_at?: string | null
          marketing_consent_version?: string | null
          marketing_opt_in?: boolean
          next_trip?: string | null
          personality?: string | null
          privacy?: string
          signup_source?: string
          travel_style?: string[] | null
          travelers_helped?: number
          trust_score?: number
          updated_at?: string
          user_id: string
          username?: string | null
          validated_score?: number
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contribution_count?: number
          created_at?: string
          display_name?: string | null
          dream_destinations?: string[] | null
          home_base?: string | null
          id?: string
          interests?: string[] | null
          is_verified?: boolean
          languages?: string[] | null
          marketing_consent_at?: string | null
          marketing_consent_version?: string | null
          marketing_opt_in?: boolean
          next_trip?: string | null
          personality?: string | null
          privacy?: string
          signup_source?: string
          travel_style?: string[] | null
          travelers_helped?: number
          trust_score?: number
          updated_at?: string
          user_id?: string
          username?: string | null
          validated_score?: number
          verified_at?: string | null
        }
        Relationships: []
      }
      promoted_places: {
        Row: {
          business_name: string
          business_type: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          impressions: number
          is_active: boolean
          place_id: string | null
          quality_score: number
          website_url: string | null
        }
        Insert: {
          business_name: string
          business_type?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          impressions?: number
          is_active?: boolean
          place_id?: string | null
          quality_score?: number
          website_url?: string | null
        }
        Update: {
          business_name?: string
          business_type?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          impressions?: number
          is_active?: boolean
          place_id?: string | null
          quality_score?: number
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promoted_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_type_mappings: {
        Row: {
          canonical_category: string
          external_type: string
          is_active: boolean
          priority: number
          provider: string
          subcategory: string
        }
        Insert: {
          canonical_category: string
          external_type: string
          is_active?: boolean
          priority?: number
          provider: string
          subcategory: string
        }
        Update: {
          canonical_category?: string
          external_type?: string
          is_active?: boolean
          priority?: number
          provider?: string
          subcategory?: string
        }
        Relationships: []
      }
      recommendation_intents: {
        Row: {
          created_at: string
          id: string
          raw_query: string
          requested_categories: string[]
          resolved_city_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_query: string
          requested_categories?: string[]
          resolved_city_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_query?: string
          requested_categories?: string[]
          resolved_city_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_intents_resolved_city_id_fkey"
            columns: ["resolved_city_id"]
            isOneToOne: false
            referencedRelation: "catalog_cities"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_place_id: string | null
          reported_user_id: string | null
          reporter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_place_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_place_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_place_id_fkey"
            columns: ["reported_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      review_scores: {
        Row: {
          authenticity_score: number
          created_at: string
          depth_score: number
          has_detailed_notes: boolean
          has_photos: boolean
          has_specific_tags: boolean
          id: string
          place_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          authenticity_score?: number
          created_at?: string
          depth_score?: number
          has_detailed_notes?: boolean
          has_photos?: boolean
          has_specific_tags?: boolean
          id?: string
          place_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          authenticity_score?: number
          created_at?: string
          depth_score?: number
          has_detailed_notes?: boolean
          has_photos?: boolean
          has_specific_tags?: boolean
          id?: string
          place_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_scores_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      spam_flags: {
        Row: {
          confidence: number
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          place_id: string | null
          resolved: boolean
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          place_id?: string | null
          resolved?: boolean
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          place_id?: string | null
          resolved?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spam_flags_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_posts: {
        Row: {
          caption: string | null
          created_at: string
          experience_id: string | null
          id: string
          journey_id: string
          photo_url: string | null
          tagged_user_ids: string[] | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          experience_id?: string | null
          id?: string
          journey_id: string
          photo_url?: string | null
          tagged_user_ids?: string[] | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          experience_id?: string | null
          id?: string
          journey_id?: string
          photo_url?: string | null
          tagged_user_ids?: string[] | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_posts_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_posts_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          ad_opt_in: boolean
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_opt_in?: boolean
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_opt_in?: boolean
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
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
      get_catalog_recommendations: {
        Args: { p_categories?: string[]; p_city_slug: string; p_limit?: number }
        Returns: {
          catalog_item_id: string
          category: string
          city_slug: string
          community_rating: number
          community_review_count: number
          description: string
          latitude: number
          longitude: number
          name: string
          quality_tier: string
          recommendation_score: number
          source: string
          subcategory: string
        }[]
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
