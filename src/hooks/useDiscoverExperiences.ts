import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DiscoverExperience {
  id: string;
  user_id: string;
  title: string;
  caption: string | null;
  city: string | null;
  country: string | null;
  category: string;
  tags: string[];
  visibility: string;
  rating: number;
  saves_count: number;
  review_count: number;
  rating_avg: number;
  engagement_score: number;
  helpful_count: number;
  experience_date: string | null;
  created_at: string;
  photos: string[];
  author_name: string;
}

export const useExperienceLocations = () => {
  return useQuery({
    queryKey: ["experience-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("country, city")
        .neq("visibility", "private")
        .not("country", "is", null)
        .not("city", "is", null);
      if (error) throw error;

      const countries = new Map<string, Set<string>>();
      for (const row of data ?? []) {
        if (!row.country || !row.city) continue;
        const c = row.country.trim();
        const ci = row.city.trim();
        if (!c) continue;
        if (!countries.has(c)) countries.set(c, new Set());
        if (ci) countries.get(c)!.add(ci);
      }

      return {
        countries: Array.from(countries.keys()).sort(),
        citiesByCountry: Object.fromEntries(
          Array.from(countries.entries()).map(([k, v]) => [k, Array.from(v).sort()])
        ),
      };
    },
  });
};

export interface DiscoverFilters {
  country: string | null;
  city: string | null;
  category: string | null;
  categories: string[];
  minRating: number;
  withPhotos: boolean;
  sortBy: "recent" | "rating" | "helpful" | "engagement";
  connectionsOnly: boolean;
  searchQuery: string;
}

export const useDiscoverExperiences = (filters: DiscoverFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["discover-experiences", filters],
    queryFn: async () => {
      let query = supabase
        .from("experiences")
        .select("*")
        .neq("visibility", "private");

      if (filters.country) {
        query = query.ilike("country", filters.country);
      }
      if (filters.city) {
        query = query.ilike("city", filters.city);
      }
      if (filters.category) {
        query = query.eq("category", filters.category);
      }
      if (filters.minRating > 0) {
        query = query.gte("rating", filters.minRating);
      }
      if (filters.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,caption.ilike.%${filters.searchQuery}%`);
      }

      switch (filters.sortBy) {
        case "rating":
          query = query.order("rating_avg", { ascending: false });
          break;
        case "helpful":
          query = query.order("helpful_count", { ascending: false });
          break;
        case "engagement":
          query = query.order("engagement_score", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      query = query.limit(100);

      const { data: experiences, error } = await query;
      if (error) throw error;

      const expIds = (experiences ?? []).map(e => e.id);

      let attachments: any[] = [];
      if (expIds.length > 0) {
        const { data: atts } = await supabase
          .from("experience_attachments")
          .select("experience_id, url")
          .in("experience_id", expIds)
          .eq("attachment_type", "photo");
        attachments = atts ?? [];
      }

      const userIds = [...new Set((experiences ?? []).map(e => e.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        profiles = profs ?? [];
      }

      let connectionIds: Set<string> | null = null;
      if (filters.connectionsOnly && user) {
        const { data: conns } = await supabase
          .from("followers")
          .select("following_id")
          .eq("follower_id", user.id)
          .eq("status", "active");
        connectionIds = new Set((conns ?? []).map(c => c.following_id));
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.display_name || "Traveler"]));

      let results: DiscoverExperience[] = (experiences ?? []).map(exp => ({
        id: exp.id,
        user_id: exp.user_id,
        title: exp.title,
        caption: exp.caption,
        city: exp.city,
        country: exp.country,
        category: exp.category,
        tags: exp.tags ?? [],
        visibility: exp.visibility,
        rating: (exp as any).rating ?? 0,
        saves_count: exp.saves_count ?? 0,
        review_count: exp.review_count ?? 0,
        rating_avg: Number(exp.rating_avg) ?? 0,
        engagement_score: Number(exp.engagement_score) ?? 0,
        helpful_count: exp.helpful_count ?? 0,
        experience_date: exp.experience_date,
        created_at: exp.created_at,
        photos: attachments.filter(a => a.experience_id === exp.id).map(a => a.url),
        author_name: profileMap.get(exp.user_id) || "Traveler",
      }));

      // Client-side multi-category filter
      if (filters.categories.length > 0) {
        results = results.filter(e =>
          filters.categories.includes(e.category) ||
          e.tags.some(t => filters.categories.includes(t.toLowerCase()))
        );
      }

      if (filters.withPhotos) {
        results = results.filter(e => e.photos.length > 0);
      }

      if (connectionIds) {
        results = results.filter(e => connectionIds!.has(e.user_id));
      }

      return results;
    },
  });
};
