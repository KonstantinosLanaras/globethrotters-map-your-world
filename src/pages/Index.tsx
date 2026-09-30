import { useState, useCallback, useMemo } from "react";
import WorldMap from "@/components/WorldMap";
import Navbar from "@/components/Navbar";
import MapControls, { type ActivityTag } from "@/components/MapControls";
import CityDetailsCard from "@/components/CityDetailsCard";
import CityExploreBar from "@/components/CityExploreBar";
import type { SearchMode } from "@/components/CityExploreBar";
import { usePlaces, Place } from "@/hooks/usePlaces";
import { useExperiencesWithPhotos } from "@/hooks/useExperiences";
import { useAuth } from "@/hooks/useAuth";
import { worldCities, City } from "@/data/cities";
import { useCatalogMapItems, type CatalogItem } from "@/hooks/useCatalog";

const Index = () => {
  // Keep the world view calm by default. Visitors can reveal the full city
  // layer from MapControls, while catalogue and saved-place pins remain visible.
  const [showCities, setShowCities] = useState(true);
  const [mapFilter, setMapFilter] = useState<"all" | "visited" | "wishlist">("all");
  const [activeTags, setActiveTags] = useState<ActivityTag[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("places");
  const [exploreBarVisible, setExploreBarVisible] = useState(true);
  const { user } = useAuth();
  const { data: places = [] } = usePlaces();
  const { data: experiences = [] } = useExperiencesWithPhotos();
  const { data: catalogItems = [] } = useCatalogMapItems();

  const stats = useMemo(() => ({
    visited: places.filter((p) => p.type === "visited").length,
    wishlist: places.filter((p) => p.type === "wishlist").length,
    countries: new Set(places.filter((p) => p.type === "visited").map((p) => p.country)).size,
  }), [places]);

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
    setExploreBarVisible(false);
  }, []);

  const handlePlaceClick = useCallback((place: Place) => {
    const matchingCity = worldCities.find(
      (c) => c.name.toLowerCase() === place.name.toLowerCase()
    );
    if (matchingCity) {
      setExploreBarVisible(false);
      setSelectedCity(matchingCity);
    } else {
      setExploreBarVisible(false);
      setSelectedCity({
        name: place.name,
        country: place.country,
        lat: place.lat,
        lng: place.lng,
        continent: "",
      });
    }
  }, []);

  const handleTagToggle = useCallback((tag: ActivityTag) => {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleCatalogItemClick = useCallback((item: CatalogItem) => {
    const matchingCity = worldCities.find(
      (candidate) => candidate.name.toLowerCase() === item.city.toLowerCase()
        && candidate.country.toLowerCase() === item.country.toLowerCase(),
    );
    setExploreBarVisible(false);
    setSelectedCity(matchingCity || {
      name: item.city,
      country: item.country,
      lat: item.lat,
      lng: item.lng,
      continent: "Europe",
    });
  }, []);

  const handleSearchModeChange = useCallback((mode: SearchMode) => {
    setSearchMode(mode);
    setExploreBarVisible(true);
  }, []);

  const handleExploreToggle = useCallback(() => {
    setExploreBarVisible(prev => !prev);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Navbar searchMode={searchMode} onSearchModeChange={handleSearchModeChange} onExploreToggle={handleExploreToggle} exploreBarVisible={exploreBarVisible} />
      <CityExploreBar
        onCitySelect={handleCityClick}
        mode={searchMode}
        onModeChange={handleSearchModeChange}
        visible={exploreBarVisible}
      />
      <MapControls
        showCities={showCities}
        onToggleCities={() => setShowCities(!showCities)}
        mapFilter={mapFilter}
        onFilterChange={setMapFilter}
        stats={stats}
        activeTags={activeTags}
        onTagToggle={handleTagToggle}
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
          places={places}
          experiences={experiences}
          catalogItems={catalogItems}
          showCities={showCities}
          mapFilter={mapFilter}
          activeTags={activeTags}
          onCityClick={handleCityClick}
          onPlaceClick={handlePlaceClick}
          onCatalogItemClick={handleCatalogItemClick}
        />
      </div>
    </div>
  );
};

export default Index;
