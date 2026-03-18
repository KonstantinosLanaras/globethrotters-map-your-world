import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Camera, MapPin, Globe, Eye, Users, Lock, Plus, Star, Image, Trash2 } from "lucide-react";
import { useExperiencesWithPhotos, useDeleteExperience, ExperienceWithPhotos } from "@/hooks/useExperiences";
import ExperienceComposer from "@/components/ExperienceComposer";
import { toast } from "sonner";

const ExperienceCard = ({ exp, onDelete }: { exp: ExperienceWithPhotos; onDelete: (id: string) => void }) => {
  const [showGallery, setShowGallery] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border hover:border-primary/10 transition-colors overflow-hidden"
    >
      {/* Photo preview */}
      {exp.photos.length > 0 && (
        <div
          className="relative cursor-pointer"
          onClick={() => setShowGallery(!showGallery)}
        >
          {exp.photos.length === 1 ? (
            <img src={exp.photos[0]} alt="" className="w-full h-48 object-cover" />
          ) : (
            <div className="grid grid-cols-2 gap-0.5 h-48">
              <img src={exp.photos[0]} alt="" className="w-full h-full object-cover" />
              <div className="relative">
                <img src={exp.photos[1]} alt="" className="w-full h-full object-cover" />
                {exp.photos.length > 2 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">+{exp.photos.length - 2}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded gallery */}
      {showGallery && exp.photos.length > 2 && (
        <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-0.5">
          {exp.photos.slice(2).map((url, i) => (
            <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />
          ))}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-display text-base font-semibold text-foreground">{exp.title}</h3>
            {exp.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {exp.city}{exp.country ? `, ${exp.country}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {exp.rating > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                {[...Array(exp.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground capitalize">{exp.category}</span>
            {exp.visibility === "public" && <Globe className="w-3 h-3 text-muted-foreground" />}
            {exp.visibility === "close_friends" && <Eye className="w-3 h-3 text-muted-foreground" />}
            {exp.visibility === "followers" && <Users className="w-3 h-3 text-muted-foreground" />}
            {exp.visibility === "private" && <Lock className="w-3 h-3 text-muted-foreground" />}
          </div>
        </div>

        {exp.caption && <p className="text-sm text-foreground/80 leading-relaxed">{exp.caption}</p>}

        {exp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {exp.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          {exp.experience_date && (
            <p className="text-[10px] text-muted-foreground">{new Date(exp.experience_date).toLocaleDateString()}</p>
          )}
          <button
            onClick={() => onDelete(exp.id)}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Experiences = () => {
  const { data: experiences = [], isLoading } = useExperiencesWithPhotos();
  const deleteExperience = useDeleteExperience();
  const [showComposer, setShowComposer] = useState(false);

  const handleDelete = (id: string) => {
    deleteExperience.mutate(id, {
      onSuccess: () => toast.success("Experience removed"),
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[80px] px-4 pb-12 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Experiences</h1>
            <p className="text-sm text-muted-foreground">Your travel experiences</p>
          </div>
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-medium text-foreground mb-2">No experiences yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first travel experience</p>
            <button
              onClick={() => setShowComposer(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Experience
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {experiences.map((exp) => (
              <ExperienceCard key={exp.id} exp={exp} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <ExperienceComposer open={showComposer} onClose={() => setShowComposer(false)} />
    </div>
  );
};

export default Experiences;
