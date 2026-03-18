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

      // Get linked experience IDs
      const { data: links, error: lErr } = await supabase
        .from("journey_experiences" as any)
        .select("experience_id")
        .eq("journey_id", journeyId!);
      if (lErr) throw lErr;

      const expIds = (links ?? []).map((l: any) => l.experience_id);
      if (expIds.length === 0) return { ...journey, experiences: [] } as JourneyWithExperiences;

      // Get experiences with photos
      const { data: exps, error: eErr } = await supabase
        .from("experiences")
        .select("*")
        .in("id", expIds)
        .order("experience_date", { ascending: true });
      if (eErr) throw eErr;

      const { data: atts } = await supabase
        .from("experience_attachments")
        .select("*")
        .in("experience_id", expIds)
        .eq("attachment_type", "photo");

      const experiences = (exps ?? []).map(exp => ({
        ...exp,
        tags: exp.tags ?? [],
        rating: (exp as any).rating ?? 0,
        photos: (atts ?? []).filter((a: any) => a.experience_id === exp.id).map((a: any) => a.url),
      })) as ExperienceWithPhotos[];

      return { ...journey, experiences } as JourneyWithExperiences;
    },
  });
};

export const useAddJourney = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (journey: { title: string; description?: string; emoji?: string; start_date?: string; end_date?: string }) => {
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
    mutationFn: async ({ journeyId, experienceId }: { journeyId: string; experienceId: string }) => {
      const { error } = await supabase
        .from("journey_experiences" as any)
        .delete()
        .eq("journey_id", journeyId)
        .eq("experience_id", experienceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journey-experiences"] }),
  });
};
