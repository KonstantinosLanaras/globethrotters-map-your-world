import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Experience {
  id: string;
  user_id: string;
  title: string;
  caption: string | null;
  city: string | null;
  country: string | null;
  category: string;
  experience_date: string | null;
  visibility: string;
  tags: string[];
  lat: number | null;
  lng: number | null;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface ExperienceAttachment {
  id: string;
  experience_id: string;
  attachment_type: string;
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface ExperienceWithPhotos extends Experience {
  photos: string[];
  saves_count: number;
  review_count: number;
  rating_avg: number;
  engagement_score: number;
}

export const useExperiences = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["experiences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Experience[];
    },
  });
};

export const useExperiencesWithPhotos = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["experiences-with-photos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: experiences, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const expIds = (experiences ?? []).map(e => e.id);
      let attachments: any[] = [];
      if (expIds.length > 0) {
        const { data: atts } = await supabase
          .from("experience_attachments")
          .select("*")
          .in("experience_id", expIds)
          .eq("attachment_type", "photo");
        attachments = atts ?? [];
      }

      return (experiences ?? []).map(exp => ({
        ...exp,
        tags: exp.tags ?? [],
        rating: (exp as any).rating ?? 0,
        photos: attachments
          .filter(a => a.experience_id === exp.id)
          .map(a => a.url),
      })) as ExperienceWithPhotos[];
    },
  });
};

export const usePublicExperiences = () => {
  return useQuery({
    queryKey: ["public-experiences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Experience[];
    },
  });
};

export const useAddExperience = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (exp: Omit<Experience, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("experiences")
        .insert({ ...exp, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Experience;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiences"] });
      qc.invalidateQueries({ queryKey: ["experiences-with-photos"] });
    },
  });
};

export const useDeleteExperience = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("experiences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiences"] });
      qc.invalidateQueries({ queryKey: ["experiences-with-photos"] });
    },
  });
};

export const useAddAttachment = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (att: Omit<ExperienceAttachment, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("experience_attachments")
        .insert(att)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiences"] });
      qc.invalidateQueries({ queryKey: ["experiences-with-photos"] });
    },
  });
};
