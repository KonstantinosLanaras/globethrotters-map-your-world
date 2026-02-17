import { useState } from "react";
import WorldMap from "@/components/WorldMap";
import Navbar from "@/components/Navbar";
import SidePanel from "@/components/SidePanel";
import LocationPanel from "@/components/LocationPanel";
import { samplePins } from "@/data/sampleData";
import { Pin } from "@/types/travel";

const Index = () => {
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <Navbar />
      <SidePanel />
      <LocationPanel pin={selectedPin} onClose={() => setSelectedPin(null)} />
      <div className="absolute inset-0 pt-[73px]">
        <WorldMap pins={samplePins} onPinClick={setSelectedPin} />
      </div>
    </div>
  );
};

export default Index;
