import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ExperienceWithPhotos } from "./useExperiences";

export interface Journey {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  emoji: string;
  start_date: string | null;
  end_date: string | null;
  destinations: string[];
  cover_image_url: string | null;
  privacy: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JourneyWithExperiences extends Journey {
  experiences: ExperienceWithPhotos[];
}

export const useJourneys = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["journeys", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journeys" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Journey[];
    },
  });
};

export const useJourneyWithExperiences = (journeyId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["journey-experiences", journeyId],
    enabled: !!user && !!journeyId,
    queryFn: async () => {
      // Get journey
      const { data: journeyData, error: jErr } = await supabase
        .from("journeys" as any)
        .select("*")
        .eq("id", journeyId!)
        .single();
      if (jErr) throw jErr;
      const journey = journeyData as unknown as Journey;

      // A trip can contain either a community experience or a catalogue place.
      const { data: links, error: lErr } = await supabase
        .from("journey_experiences" as any)
        .select("experience_id, catalog_item_id")
        .eq("journey_id", journeyId!);
      if (lErr) throw lErr;

      const expIds = (links ?? []).map((l: any) => l.experience_id).filter(Boolean);
      const catalogIds = (links ?? []).map((l: any) => l.catalog_item_id).filter(Boolean);
      if (expIds.length === 0 && catalogIds.length === 0) {
        return { ...journey, experiences: [] } as JourneyWithExperiences;
      }

      let exps: any[] = [];
      let atts: any[] = [];
      if (expIds.length > 0) {
        const expResult = await supabase
          .from("experiences")
          .select("*")
          .in("id", expIds)
          .order("experience_date", { ascending: true });
        if (expResult.error) throw expResult.error;
        exps = expResult.data ?? [];

        const attachmentResult = await supabase
          .from("experience_attachments")
          .select("*")
          .in("experience_id", expIds)
          .eq("attachment_type", "photo");
        atts = attachmentResult.data ?? [];
      }

      const experiences = exps.map(exp => ({
        ...exp,
        source_type: "experience" as const,
        tags: exp.tags ?? [],
        rating: (exp as any).rating ?? 0,
        photos: atts.filter((a: any) => a.experience_id === exp.id).map((a: any) => a.url),
      })) as ExperienceWithPhotos[];

      let catalogExperiences: ExperienceWithPhotos[] = [];
      if (catalogIds.length > 0) {
        const catalogResult = await supabase
          .from("catalog_items" as any)
          .select("id, name, latitude, longitude, canonical_category, subcategory, description, published_at, catalog_cities(name, country)")
          .in("id", catalogIds);
        if (catalogResult.error) throw catalogResult.error;
        catalogExperiences = (catalogResult.data ?? []).map((row: any) => ({
          id: row.id,
          catalog_item_id: row.id,
          source_type: "catalog" as const,
          user_id: "",
          title: row.name,
          caption: row.description ?? null,
          city: row.catalog_cities?.name ?? null,
          country: row.catalog_cities?.country ?? null,
          category: row.canonical_category ?? row.subcategory ?? "place",
          experience_date: null,
          visibility: "private",
          tags: [row.canonical_category, row.subcategory].filter(Boolean),
          lat: row.latitude ?? null,
          lng: row.longitude ?? null,
          rating: 0,
          created_at: row.published_at ?? new Date(0).toISOString(),
          updated_at: row.published_at ?? new Date(0).toISOString(),
          photos: [],
          saves_count: 0,
          review_count: 0,
          rating_avg: 0,
          engagement_score: 0,
        }));
      }

      const byId = new Map([...experiences, ...catalogExperiences].map((item) => [item.id, item]));
      const ordered = (links ?? [])
        .map((link: any) => byId.get(link.experience_id || link.catalog_item_id))
        .filter(Boolean) as ExperienceWithPhotos[];

      return { ...journey, experiences: ordered } as JourneyWithExperiences;
    },
  });
};

export const useAddJourney = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (journey: { title: string; description?: string; emoji?: string; start_date?: string; end_date?: string; destinations?: string[]; cover_image_url?: string; privacy?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("journeys" as any)
        .insert({ ...journey, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Journey;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journeys"] }),
  });
};

export const useDeleteJourney = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journeys" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journeys"] }),
  });
};

export const useAddExperienceToJourney = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ journeyId, experienceId }: { journeyId: string; experienceId: string }) => {
      const { error } = await supabase
        .from("journey_experiences" as any)
        .insert({ journey_id: journeyId, experience_id: experienceId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journey-experiences"] }),
  });
};

export const useRemoveExperienceFromJourney = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ journeyId, experienceId, catalogItemId }: { journeyId: string; experienceId?: string; catalogItemId?: string }) => {
      let query = supabase
        .from("journey_experiences" as any)
        .delete()
        .eq("journey_id", journeyId);
      query = catalogItemId
        ? query.eq("catalog_item_id", catalogItemId)
        : query.eq("experience_id", experienceId!);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journey-experiences"] }),
  });
};
