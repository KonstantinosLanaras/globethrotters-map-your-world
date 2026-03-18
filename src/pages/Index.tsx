import { useState, useCallback, useMemo } from "react";
import WorldMap from "@/components/WorldMap";
import Navbar from "@/components/Navbar";
import MapControls from "@/components/MapControls";
import CityDetailsCard from "@/components/CityDetailsCard";
import CityExploreBar from "@/components/CityExploreBar";
import { usePlaces, useUpdatePlace, useDeletePlace, Place } from "@/hooks/usePlaces";
import { useExperiencesWithPhotos } from "@/hooks/useExperiences";
import { useLists } from "@/hooks/useLists";
import { useAllListPlaces } from "@/hooks/useListPlaces";
import { useAuth } from "@/hooks/useAuth";
import { worldCities, City } from "@/data/cities";
import { toast } from "sonner";

const Index = () => {
  const [showCities, setShowCities] = useState(true);
  const [mapFilter, setMapFilter] = useState<"all" | "visited" | "wishlist">("all");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: places = [] } = usePlaces();
  const { data: experiences = [] } = useExperiencesWithPhotos();
  const { data: lists = [] } = useLists();
  const { data: allListPlaces = [] } = useAllListPlaces();
  const updatePlace = useUpdatePlace();
  const deletePlace = useDeletePlace();

  const stats = useMemo(() => ({
    visited: places.filter((p) => p.type === "visited").length,
    wishlist: places.filter((p) => p.type === "wishlist").length,
    countries: new Set(places.filter((p) => p.type === "visited").map((p) => p.country)).size,
  }), [places]);

  // Filter places by selected list
  const filteredPlaces = useMemo(() => {
    if (!selectedListId) return places;
    const placeIdsInList = new Set(
      allListPlaces.filter((lp) => lp.list_id === selectedListId).map((lp) => lp.place_id)
    );
    return places.filter((p) => placeIdsInList.has(p.id));
  }, [places, selectedListId, allListPlaces]);

  const savedPlace = useMemo(() => {
    if (!selectedCity || !user) return null;
    return places.find(
      (p) =>
        p.user_id === user.id &&
        p.name.toLowerCase() === selectedCity.name.toLowerCase() &&
        p.country.toLowerCase() === selectedCity.country.toLowerCase()
    ) ?? null;
  }, [selectedCity, places, user]);

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

  const handleTogglePlace = useCallback((place: Place) => {
    const newType = place.type === "visited" ? "wishlist" : "visited";
    updatePlace.mutate(
      { id: place.id, type: newType },
      {
        onSuccess: () => toast.success(`Moved to ${newType === "visited" ? "Visited" : "Wishlist"}`),
        onError: () => toast.error("Failed to update place"),
      }
    );
  }, [updatePlace]);

  const handleRemovePlace = useCallback((placeId: string) => {
    deletePlace.mutate(placeId, {
      onSuccess: () => toast.success("Place removed from map"),
      onError: () => toast.error("Failed to remove place"),
    });
  }, [deletePlace]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Navbar />
      <CityExploreBar onCitySelect={handleCityClick} />
      <MapControls
        showCities={showCities}
        onToggleCities={() => setShowCities(!showCities)}
        mapFilter={mapFilter}
        onFilterChange={setMapFilter}
        stats={stats}
        lists={lists.map((l) => ({ id: l.id, title: l.title, emoji: l.emoji || "📍" }))}
        selectedListId={selectedListId}
        onListSelect={setSelectedListId}
      />
      {selectedCity && (
        <CityDetailsCard
          city={selectedCity}
          savedPlace={savedPlace}
          onClose={() => setSelectedCity(null)}
        />
      )}
      
      <div className="absolute inset-0 pt-[60px]">
        <WorldMap
          cities={worldCities}
          places={filteredPlaces}
          experiences={experiences}
          showCities={showCities}
          mapFilter={mapFilter}
          onCityClick={handleCityClick}
          onPlaceClick={handlePlaceClick}
          onTogglePlace={handleTogglePlace}
          onRemovePlace={handleRemovePlace}
        />
      </div>
    </div>
  );
};

export default Index;
