import { useState } from "react";
import WorldMap from "@/components/WorldMap";
import Navbar from "@/components/Navbar";
import SidePanel from "@/components/SidePanel";
import LocationPanel from "@/components/LocationPanel";
import GlobethrottersLogo from "@/components/GlobethrottersLogo";
import { usePlaces, Place } from "@/hooks/usePlaces";
import { Pin } from "@/types/travel";

const Index = () => {
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const { data: places = [] } = usePlaces();

  // Map DB places to Pin type for existing components
  const pins: Pin[] = places.map((p: Place) => ({
    id: p.id,
    name: p.name,
    country: p.country,
    lat: p.lat,
    lng: p.lng,
    type: p.type as "visited" | "wishlist",
    tags: p.tags || [],
    rating: p.rating || 0,
    notes: p.notes || "",
    photos: [],
    dateVisited: p.date_visited || undefined,
  }));

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <Navbar />
      <SidePanel />
      <LocationPanel pin={selectedPin} onClose={() => setSelectedPin(null)} />
      {/* Subtle brand watermark */}
      <div className="absolute bottom-4 right-4 z-[500] opacity-20 hover:opacity-40 transition-opacity duration-500 pointer-events-none">
        <GlobethrottersLogo variant="icon" size={36} animate={false} className="text-foreground" />
      </div>
      <div className="absolute inset-0 pt-[73px]">
        <WorldMap pins={pins} onPinClick={setSelectedPin} />
      </div>
    </div>
  );
};

export default Index;
