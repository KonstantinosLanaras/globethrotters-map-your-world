import { useState, useCallback, useMemo } from "react";
import WorldMap from "@/components/WorldMap";
import Navbar from "@/components/Navbar";
import MapControls from "@/components/MapControls";
import CityDetailsCard from "@/components/CityDetailsCard";
import RecommendationsSection from "@/components/RecommendationsSection";
import { usePlaces, Place } from "@/hooks/usePlaces";
import { worldCities, City } from "@/data/cities";

const Index = () => {
  const [showCities, setShowCities] = useState(true);
  const [mapFilter, setMapFilter] = useState<"all" | "visited" | "wishlist">("all");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const { data: places = [] } = usePlaces();

  const stats = useMemo(() => ({
    visited: places.filter((p) => p.type === "visited").length,
    wishlist: places.filter((p) => p.type === "wishlist").length,
    countries: new Set(places.filter((p) => p.type === "visited").map((p) => p.country)).size,
  }), [places]);

  const savedPlace = useMemo(() => {
    if (!selectedCity) return null;
    return places.find(
      (p) =>
        p.name.toLowerCase() === selectedCity.name.toLowerCase() &&
        p.country.toLowerCase() === selectedCity.country.toLowerCase()
    ) ?? null;
  }, [selectedCity, places]);

  const handleCityClick = useCallback((city: City) => {
    setSelectedCity(city);
  }, []);

  const handlePlaceClick = useCallback((place: Place) => {
    const matchingCity = worldCities.find(
      (c) => c.name.toLowerCase() === place.name.toLowerCase()
    );
    if (matchingCity) {
      setSelectedCity(matchingCity);
    } else {
      setSelectedCity({
        name: place.name,
        country: place.country,
        lat: place.lat,
        lng: place.lng,
        continent: "",
      });
    }
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <Navbar />
      <MapControls
        showCities={showCities}
        onToggleCities={() => setShowCities(!showCities)}
        mapFilter={mapFilter}
        onFilterChange={setMapFilter}
        stats={stats}
      />
      {selectedCity && (
        <CityDetailsCard
          city={selectedCity}
          savedPlace={savedPlace}
          onClose={() => setSelectedCity(null)}
        />
      )}
      {!selectedCity && <RecommendationsSection />}
      <div className="absolute inset-0 pt-[60px]">
        <WorldMap
          cities={worldCities}
          places={places}
          showCities={showCities}
          mapFilter={mapFilter}
          onCityClick={handleCityClick}
          onPlaceClick={handlePlaceClick}
        />
      </div>
    </div>
  );
};

export default Index;
