import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Camera, MapPin, Globe, Eye, Users, Lock, Plus } from "lucide-react";
import { useExperiences } from "@/hooks/useExperiences";
import ExperienceComposer from "@/components/ExperienceComposer";

const Experiences = () => {
  const { data: experiences = [], isLoading } = useExperiences();
  const [showComposer, setShowComposer] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[80px] px-4 pb-12 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Experiences</h1>
            <p className="text-sm text-muted-foreground">Your travel stories and memories</p>
          </div>
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Share
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
            <p className="text-sm text-muted-foreground mb-4">Share your first travel experience</p>
            <button
              onClick={() => setShowComposer(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              <Camera className="w-4 h-4" />
              Share Experience
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {experiences.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-2xl bg-card border border-border hover:border-primary/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">{exp.title}</h3>
                    {exp.city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {exp.city}{exp.country ? `, ${exp.country}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
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
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-primary/8 text-[10px] font-medium text-primary">{tag}</span>
                    ))}
                  </div>
                )}
                {exp.experience_date && (
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(exp.experience_date).toLocaleDateString()}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ExperienceComposer open={showComposer} onClose={() => setShowComposer(false)} />
    </div>
  );
};

export default Experiences;
