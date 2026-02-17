import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ArrowRight, Check, MapPin, Compass, Heart, Coffee, Mountain, Palette, BookOpen, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const personalities = [
  { id: "explorer", emoji: "🧭", title: "The Explorer", desc: "You chase horizons and unmarked trails" },
  { id: "curator", emoji: "🏛️", title: "The Curator", desc: "You seek culture, art, and meaning" },
  { id: "epicure", emoji: "🍷", title: "The Epicure", desc: "You travel through taste and terroir" },
  { id: "seeker", emoji: "🕊️", title: "The Seeker", desc: "You find peace in sacred and quiet places" },
  { id: "adventurer", emoji: "⛰️", title: "The Adventurer", desc: "You live for adrenaline and wild landscapes" },
  { id: "flaneur", emoji: "🚶", title: "The Flâneur", desc: "You wander slowly, savoring every corner" },
];

const samplePlaces = [
  { id: "kyoto", name: "Kyoto", country: "Japan", emoji: "⛩️" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", emoji: "🇵🇹" },
  { id: "marrakech", name: "Marrakech", country: "Morocco", emoji: "🕌" },
  { id: "patagonia", name: "Patagonia", country: "Argentina", emoji: "🏔️" },
  { id: "santorini", name: "Santorini", country: "Greece", emoji: "🏖️" },
  { id: "bali", name: "Bali", country: "Indonesia", emoji: "🌺" },
  { id: "reykjavik", name: "Reykjavik", country: "Iceland", emoji: "🌋" },
  { id: "oaxaca", name: "Oaxaca", country: "Mexico", emoji: "🌮" },
];

const interests = [
  { id: "culture", label: "Culture & History", icon: <Palette className="w-4 h-4" /> },
  { id: "food", label: "Food & Wine", icon: <Coffee className="w-4 h-4" /> },
  { id: "nature", label: "Nature & Wildlife", icon: <Mountain className="w-4 h-4" /> },
  { id: "adventure", label: "Adventure", icon: <Compass className="w-4 h-4" /> },
  { id: "wellness", label: "Wellness & Retreat", icon: <Heart className="w-4 h-4" /> },
  { id: "literature", label: "Literature & Art", icon: <BookOpen className="w-4 h-4" /> },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [personality, setPersonality] = useState<string | null>(null);
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const navigate = useNavigate();

  const togglePlace = (id: string) => {
    setSelectedPlaces((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const canProceed =
    (step === 0) ||
    (step === 1 && personality) ||
    (step === 2 && selectedPlaces.length > 0) ||
    (step === 3 && selectedInterests.length > 0);

  const handleNext = () => {
    if (step === 3) {
      localStorage.setItem("globethrotters_onboarded", "true");
      navigate("/");
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      {/* Progress */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {[0, 1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 rounded-full transition-all duration-500 ${
              s <= step ? "w-8 bg-primary" : "w-4 bg-border"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8"
            >
              <Globe className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4 leading-tight">
              Welcome to<br />Globethrotters
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-2">
              Your personal atlas of places that matter.
            </p>
            <p className="text-muted-foreground/70 text-sm">
              No feeds. No followers. Just the places that shaped you.
            </p>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="personality"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg text-center"
          >
            <Sparkles className="w-6 h-6 text-gold mx-auto mb-4" />
            <h2 className="font-display text-3xl font-semibold text-foreground mb-2">
              What kind of traveler are you?
            </h2>
            <p className="text-muted-foreground mb-8">Choose the one that resonates most</p>
            <div className="grid grid-cols-2 gap-3">
              {personalities.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setPersonality(p.id)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-300 ${
                    personality === p.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="text-2xl mb-2 block">{p.emoji}</span>
                  <p className="font-body text-sm font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                  {personality === p.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <Check className="w-4 h-4 text-primary" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="places"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg text-center"
          >
            <MapPin className="w-6 h-6 text-primary mx-auto mb-4" />
            <h2 className="font-display text-3xl font-semibold text-foreground mb-2">
              Pin your first places
            </h2>
            <p className="text-muted-foreground mb-8">Select places you've been or dream of visiting</p>
            <div className="grid grid-cols-2 gap-3">
              {samplePlaces.map((place, i) => (
                <motion.button
                  key={place.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => togglePlace(place.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-300 ${
                    selectedPlaces.includes(place.id)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="text-xl">{place.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{place.name}</p>
                    <p className="text-xs text-muted-foreground">{place.country}</p>
                  </div>
                  {selectedPlaces.includes(place.id) && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="interests"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg text-center"
          >
            <Heart className="w-6 h-6 text-terracotta mx-auto mb-4" />
            <h2 className="font-display text-3xl font-semibold text-foreground mb-2">
              What draws you to a place?
            </h2>
            <p className="text-muted-foreground mb-8">Select all that resonate</p>
            <div className="grid grid-cols-2 gap-3">
              {interests.map((interest, i) => (
                <motion.button
                  key={interest.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => toggleInterest(interest.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-300 ${
                    selectedInterests.includes(interest.id)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className={`${selectedInterests.includes(interest.id) ? "text-primary" : "text-muted-foreground"}`}>
                    {interest.icon}
                  </div>
                  <p className="text-sm font-medium text-foreground">{interest.label}</p>
                  {selectedInterests.includes(interest.id) && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: canProceed ? 1 : 0.4 }}
        onClick={handleNext}
        disabled={!canProceed}
        className="fixed bottom-10 flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-body font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-300 disabled:cursor-not-allowed"
      >
        {step === 0 ? "Begin" : step === 3 ? "Start Exploring" : "Continue"}
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
};

export default Onboarding;
