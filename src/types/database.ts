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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          itinerary_id: string
          location_lat: number | null
          location_lng: number | null
          name: string
          order_index: number | null
          price: string | null
          time: string | null
          type: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          itinerary_id: string
          location_lat?: number | null
          location_lng?: number | null
          name: string
          order_index?: number | null
          price?: string | null
          time?: string | null
          type: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          itinerary_id?: string
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          order_index?: number | null
          price?: string | null
          time?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "trip_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      attractions: {
        Row: {
          address: string | null
          avg_rating: number | null
          best_time_to_visit: string | null
          category: string | null
          created_at: string | null
          description: string | null
          destination_id: string | null
          embedding: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          name: string
          opening_hours: Json | null
          popularity_score: number | null
          recommended_duration: string | null
          review_count: number | null
          tags: string[] | null
          ticket_price: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avg_rating?: number | null
          best_time_to_visit?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          embedding?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          name: string
          opening_hours?: Json | null
          popularity_score?: number | null
          recommended_duration?: string | null
          review_count?: number | null
          tags?: string[] | null
          ticket_price?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avg_rating?: number | null
          best_time_to_visit?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          embedding?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          opening_hours?: Json | null
          popularity_score?: number | null
          recommended_duration?: string | null
          review_count?: number | null
          tags?: string[] | null
          ticket_price?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attractions_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "trip_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          average_budget_daily: string | null
          best_season: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          embedding: string | null
          id: string
          name: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          average_budget_daily?: string | null
          best_season?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          name: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          average_budget_daily?: string | null
          best_season?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          name?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      food_encyclopedia: {
        Row: {
          allergen_note: string | null
          allergens: string[] | null
          category: string
          created_at: string | null
          cuisine: string
          flavor_md: string | null
          foreign_analogies: Json | null
          id: string
          is_published: boolean | null
          name_en: string | null
          name_pinyin: string | null
          name_zh: string
          ordering_tips: string | null
          spice_level: number | null
          traveler_tips: string | null
          updated_at: string | null
        }
        Insert: {
          allergen_note?: string | null
          allergens?: string[] | null
          category: string
          created_at?: string | null
          cuisine: string
          flavor_md?: string | null
          foreign_analogies?: Json | null
          id?: string
          is_published?: boolean | null
          name_en?: string | null
          name_pinyin?: string | null
          name_zh: string
          ordering_tips?: string | null
          spice_level?: number | null
          traveler_tips?: string | null
          updated_at?: string | null
        }
        Update: {
          allergen_note?: string | null
          allergens?: string[] | null
          category?: string
          created_at?: string | null
          cuisine?: string
          flavor_md?: string | null
          foreign_analogies?: Json | null
          id?: string
          is_published?: boolean | null
          name_en?: string | null
          name_pinyin?: string | null
          name_zh?: string
          ordering_tips?: string | null
          spice_level?: number | null
          traveler_tips?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      location_articles: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          cover: string | null
          created_at: string
          id: string
          likes: number
          location_id: string
          title: string
          url: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          cover?: string | null
          created_at?: string
          id?: string
          likes?: number
          location_id: string
          title: string
          url?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          cover?: string | null
          created_at?: string
          id?: string
          likes?: number
          location_id?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_articles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "trip_map_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_videos: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          created_at: string
          date: string | null
          id: string
          location_id: string
          platform: Database["public"]["Enums"]["video_platform"]
          thumbnail: string | null
          title: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          created_at?: string
          date?: string | null
          id?: string
          location_id: string
          platform?: Database["public"]["Enums"]["video_platform"]
          thumbnail?: string | null
          title?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          created_at?: string
          date?: string | null
          id?: string
          location_id?: string
          platform?: Database["public"]["Enums"]["video_platform"]
          thumbnail?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_videos_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "trip_map_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          avg_rating: number | null
          created_at: string | null
          cuisine_type: string | null
          description: string | null
          destination_id: string | null
          dietary_options: string[] | null
          embedding: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          meal_type: string | null
          name: string
          opening_hours: Json | null
          popularity_score: number | null
          price_range: string | null
          reservation_required: boolean | null
          review_count: number | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avg_rating?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          destination_id?: string | null
          dietary_options?: string[] | null
          embedding?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          meal_type?: string | null
          name: string
          opening_hours?: Json | null
          popularity_score?: number | null
          price_range?: string | null
          reservation_required?: boolean | null
          review_count?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avg_rating?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          destination_id?: string | null
          dietary_options?: string[] | null
          embedding?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          meal_type?: string | null
          name?: string
          opening_hours?: Json | null
          popularity_score?: number | null
          price_range?: string | null
          reservation_required?: boolean | null
          review_count?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_trips: {
        Row: {
          comments_count: number | null
          cover_image: string | null
          description: string | null
          featured: boolean | null
          highlights: string[] | null
          id: string
          is_active: boolean | null
          likes_count: number | null
          saves_count: number | null
          shared_at: string | null
          tags: string[] | null
          title: string | null
          trip_id: string
          updated_at: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          comments_count?: number | null
          cover_image?: string | null
          description?: string | null
          featured?: boolean | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean | null
          likes_count?: number | null
          saves_count?: number | null
          shared_at?: string | null
          tags?: string[] | null
          title?: string | null
          trip_id: string
          updated_at?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          comments_count?: number | null
          cover_image?: string | null
          description?: string | null
          featured?: boolean | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean | null
          likes_count?: number | null
          saves_count?: number | null
          shared_at?: string | null
          tags?: string[] | null
          title?: string | null
          trip_id?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_trips_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transportation: {
        Row: {
          created_at: string | null
          description: string | null
          destination_id: string | null
          embedding: string | null
          id: string
          name: string | null
          operating_hours: string | null
          price_info: Json | null
          tips: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          embedding?: string | null
          id?: string
          name?: string | null
          operating_hours?: string | null
          price_info?: Json | null
          tips?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          embedding?: string | null
          id?: string
          name?: string | null
          operating_hours?: string | null
          price_info?: Json | null
          tips?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transportation_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_tips: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          destination_id: string | null
          embedding: string | null
          id: string
          is_important: boolean | null
          season_specific: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          destination_id?: string | null
          embedding?: string | null
          id?: string
          is_important?: boolean | null
          season_specific?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          destination_id?: string | null
          embedding?: string | null
          id?: string
          is_important?: boolean | null
          season_specific?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_tips_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          likes_count: number | null
          parent_id: string | null
          shared_trip_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          likes_count?: number | null
          parent_id?: string | null
          shared_trip_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          likes_count?: number | null
          parent_id?: string | null
          shared_trip_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_comments_shared_trip_id_fkey"
            columns: ["shared_trip_id"]
            isOneToOne: false
            referencedRelation: "shared_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "trip_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_examples: {
        Row: {
          budget_range: string | null
          created_at: string | null
          daily_structure: Json | null
          destination: string | null
          duration_days: number | null
          embedding: string | null
          highlights: string[] | null
          id: string
          likes_count: number | null
          quality_score: number | null
          saves_count: number | null
          shared_trip_id: string | null
        }
        Insert: {
          budget_range?: string | null
          created_at?: string | null
          daily_structure?: Json | null
          destination?: string | null
          duration_days?: number | null
          embedding?: string | null
          highlights?: string[] | null
          id?: string
          likes_count?: number | null
          quality_score?: number | null
          saves_count?: number | null
          shared_trip_id?: string | null
        }
        Update: {
          budget_range?: string | null
          created_at?: string | null
          daily_structure?: Json | null
          destination?: string | null
          duration_days?: number | null
          embedding?: string | null
          highlights?: string[] | null
          id?: string
          likes_count?: number | null
          quality_score?: number | null
          saves_count?: number | null
          shared_trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_examples_shared_trip_id_fkey"
            columns: ["shared_trip_id"]
            isOneToOne: false
            referencedRelation: "shared_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_itineraries: {
        Row: {
          created_at: string | null
          date: string | null
          day_number: number
          id: string
          theme: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          day_number: number
          id?: string
          theme?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          day_number?: number
          id?: string
          theme?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_itineraries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_map_locations: {
        Row: {
          address: string | null
          city: string
          created_at: string
          district: string | null
          id: string
          lat: number
          lng: number
          name: string
          order_index: number
          trip_id: string
          type: Database["public"]["Enums"]["map_location_type"]
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          district?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          order_index?: number
          trip_id: string
          type?: Database["public"]["Enums"]["map_location_type"]
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          district?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          order_index?: number
          trip_id?: string
          type?: Database["public"]["Enums"]["map_location_type"]
        }
        Relationships: [
          {
            foreignKeyName: "trip_map_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          ai_generated_at: string | null
          ai_prompt: string | null
          budget: string | null
          created_at: string | null
          destination: string
          duration: string | null
          end_date: string
          forked_from: string | null
          id: string
          image_url: string | null
          source: string | null
          start_date: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated_at?: string | null
          ai_prompt?: string | null
          budget?: string | null
          created_at?: string | null
          destination: string
          duration?: string | null
          end_date: string
          forked_from?: string | null
          id?: string
          image_url?: string | null
          source?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated_at?: string | null
          ai_prompt?: string | null
          budget?: string | null
          created_at?: string | null
          destination?: string
          duration?: string | null
          end_date?: string
          forked_from?: string | null
          id?: string
          image_url?: string | null
          source?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string | null
          id: string
          liked: boolean | null
          liked_at: string | null
          saved: boolean | null
          saved_at: string | null
          shared_trip_id: string
          updated_at: string | null
          user_id: string
          viewed: boolean | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          liked?: boolean | null
          liked_at?: string | null
          saved?: boolean | null
          saved_at?: string | null
          shared_trip_id: string
          updated_at?: string | null
          user_id: string
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          liked?: boolean | null
          liked_at?: string | null
          saved?: boolean | null
          saved_at?: string | null
          shared_trip_id?: string
          updated_at?: string | null
          user_id?: string
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_shared_trip_id_fkey"
            columns: ["shared_trip_id"]
            isOneToOne: false
            referencedRelation: "shared_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          budget_level: string | null
          dietary_restrictions: string[] | null
          favorite_categories: string[] | null
          interaction_history: Json | null
          last_updated: string | null
          preferred_destinations: string[] | null
          preferred_pace: string | null
          user_id: string
        }
        Insert: {
          budget_level?: string | null
          dietary_restrictions?: string[] | null
          favorite_categories?: string[] | null
          interaction_history?: Json | null
          last_updated?: string | null
          preferred_destinations?: string[] | null
          preferred_pace?: string | null
          user_id: string
        }
        Update: {
          budget_level?: string | null
          dietary_restrictions?: string[] | null
          favorite_categories?: string[] | null
          interaction_history?: Json | null
          last_updated?: string | null
          preferred_destinations?: string[] | null
          preferred_pace?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          followers_count: number
          following_count: number
          id: string
          language: string | null
          theme: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          followers_count?: number
          following_count?: number
          id: string
          language?: string | null
          theme?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          followers_count?: number
          following_count?: number
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_attractions: {
        Args: {
          destination_filter?: string
          locale_filter?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          description: string
          id: string
          location_lat: number
          location_lng: number
          name: string
          recommended_duration: string
          similarity: number
          tags: string[]
          ticket_price: string
        }[]
      }
      match_restaurants: {
        Args: {
          destination_filter?: string
          locale_filter?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          cuisine_type: string
          description: string
          id: string
          location_lat: number
          location_lng: number
          name: string
          price_range: string
          similarity: number
          specialties: string[]
        }[]
      }
      match_travel_tips: {
        Args: {
          destination_filter?: string
          locale_filter?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          is_important: boolean
          similarity: number
          title: string
        }[]
      }
      match_trip_examples: {
        Args: {
          locale_filter?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          budget_range: string
          destination: string
          duration_days: number
          highlights: string[]
          id: string
          likes_count: number
          quality_score: number
          saves_count: number
          similarity: number
        }[]
      }
    }
    Enums: {
      map_location_type: "restaurant" | "attraction" | "hotel"
      video_platform: "douyin" | "xiaohongshu"
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
      map_location_type: ["restaurant", "attraction", "hotel"],
      video_platform: ["douyin", "xiaohongshu"],
    },
  },
} as const
