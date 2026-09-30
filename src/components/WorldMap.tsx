import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { City } from "@/data/cities";
import { Place } from "@/hooks/usePlaces";
import { ExperienceWithPhotos } from "@/hooks/useExperiences";
import type { ActivityTag } from "@/components/MapControls";
import type { CatalogItem } from "@/hooks/useCatalog";

const VISITED_COLOR = "hsl(0, 72%, 51%)";
const WISHLIST_COLOR = "hsl(217, 91%, 60%)";
const DEFAULT_COLOR = "hsl(30, 8%, 50%)";
const CATALOG_COLORS: Record<string, string> = {
  food: "#f97316",
  culture: "#2563eb",
  nature: "#059669",
  nightlife: "#7c3aed",
};

const escapeTooltip = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
}[character] || character));

const createCityIcon = (status: "none" | "visited" | "wishlist") => {
  if (status === "visited") {
    return L.divIcon({
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${VISITED_COLOR};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
      className: "city-marker-visited",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }
  if (status === "wishlist") {
    return L.divIcon({
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${WISHLIST_COLOR};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
      className: "city-marker-wishlist",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }
  return L.divIcon({
    html: `<div style="width:7px;height:7px;border-radius:50%;background:${DEFAULT_COLOR};border:1.5px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.16);opacity:0.58;"></div>`,
    className: "city-marker-default",
    iconSize: [7, 7],
    iconAnchor: [3.5, 3.5],
  });
};

const createSavedPinIcon = (type: "visited" | "wishlist") => {
  const pinColor = type === "visited" ? "#E53935" : "#1E88E5";
  const headGradientId = type === "visited" ? "headGradV" : "headGradW";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">
      <defs>
        <radialGradient id="${headGradientId}" cx="40%" cy="35%" r="55%">
          <stop offset="0%" stop-color="${type === 'visited' ? '#FF7043' : '#64B5F6'}"/>
          <stop offset="100%" stop-color="${pinColor}"/>
        </radialGradient>
      </defs>
      <line x1="13" y1="22" x2="13" y2="37" stroke="#888" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="13" cy="13" r="11" fill="url(#${headGradientId})" stroke="white" stroke-width="1.5"/>
      <ellipse cx="10" cy="10" rx="4" ry="3.5" fill="white" opacity="0.35"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: type === "visited" ? "saved-pin-visited" : "saved-pin-wishlist",
    iconSize: [26, 38],
    iconAnchor: [13, 38],
    popupAnchor: [0, -38],
  });
};

// Tag matching logic for filtering places by activity tags
const TAG_MATCH_MAP: Record<string, string[]> = {
  food: ["food", "restaurant", "cafe", "bakery", "dining"],
  culture: ["culture", "museum", "monument", "architecture", "gallery", "historic"],
  nature: ["nature", "scenic", "park", "lake", "waterfall", "hiking", "hike", "trail", "trek"],
  nightlife: ["nightlife", "bars", "club", "lounge", "pub"],
  beach: ["beach", "coast", "seaside"],
  museum: ["museum", "gallery", "exhibition"],
  hidden_gem: ["hidden_gem", "hidden gem", "off-beat", "secret", "underrated"],
  stay: ["stay", "hotel", "hostel", "accommodation", "airbnb"],
};

const placeMatchesTags = (place: Place, tags: ActivityTag[]): boolean => {
  if (tags.length === 0) return true;
  const placeTags = (place.tags || []).map(t => t.toLowerCase());
  return tags.some(tag => {
    const matchTerms = TAG_MATCH_MAP[tag] || [tag];
    return matchTerms.some(term => placeTags.includes(term));
  });
};

interface WorldMapProps {
  cities: City[];
  places: Place[];
  experiences?: ExperienceWithPhotos[];
  catalogItems?: CatalogItem[];
  showCities: boolean;
  showExperiences?: boolean;
  mapFilter: "all" | "visited" | "wishlist";
  activeTags?: ActivityTag[];
  onCityClick: (city: City) => void;
  onPlaceClick: (place: Place) => void;
  onCatalogItemClick?: (item: CatalogItem) => void;
}

const WorldMap = ({ cities, places, experiences = [], catalogItems = [], showCities, showExperiences = false, mapFilter, activeTags = [], onCityClick, onPlaceClick, onCatalogItemClick }: WorldMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cityLayerRef = useRef<L.LayerGroup | null>(null);
  const placeLayerRef = useRef<L.LayerGroup | null>(null);
  const catalogLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [50, 10],
      zoom: 4,
      minZoom: 2,
      maxZoom: 14,
      scrollWheelZoom: true,
      attributionControl: false,
      worldCopyJump: true,
      zoomControl: false,
      maxBounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
      maxBoundsViscosity: 1.0,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
    L.tileLayer(
      import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: import.meta.env.VITE_MAP_ATTRIBUTION || "&copy; OpenStreetMap",
        maxZoom: 19,
      },
    ).addTo(map);

    cityLayerRef.current = L.layerGroup().addTo(map);
    placeLayerRef.current = L.layerGroup().addTo(map);
    catalogLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || hasFittedRef.current || places.length === 0) return;
    hasFittedRef.current = true;
    const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng] as [number, number]));
    if (places.length === 1) {
      mapRef.current.setView([places[0].lat, places[0].lng], 8, { animate: true });
    } else {
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 10, animate: true });
    }
  }, [places]);

  const getCityStatus = useCallback(
    (city: City): "none" | "visited" | "wishlist" => {
      const match = places.find(
        (p) =>
          p.country.toLowerCase() === city.country.toLowerCase() &&
          (p.name.toLowerCase() === city.name.toLowerCase() ||
           p.city?.toLowerCase() === city.name.toLowerCase())
      );
      if (match) {
        const hasVisited = places.some(
          (p) =>
            p.country.toLowerCase() === city.country.toLowerCase() &&
            (p.name.toLowerCase() === city.name.toLowerCase() ||
             p.city?.toLowerCase() === city.name.toLowerCase()) &&
            p.type === "visited"
        );
        return hasVisited ? "visited" : match.type as "visited" | "wishlist";
      }
      return "none";
    },
    [places]
  );

  useEffect(() => {
    const layer = cityLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showCities) return;

    cities.forEach((city) => {
      const status = getCityStatus(city);
      if (mapFilter === "visited" && status !== "visited") return;
      if (mapFilter === "wishlist" && status !== "wishlist") return;
      if (status !== "none") return;

      const marker = L.marker([city.lat, city.lng], {
        icon: createCityIcon(status),
        zIndexOffset: 0,
      });
      marker.bindTooltip(
        `<span style="font-weight:600;font-size:12px;">${city.name}</span><br/><span style="font-size:10px;color:#888;">${city.country}</span>`,
        { direction: "top", offset: [0, -8], className: "city-tooltip" }
      );
      marker.on("click", () => onCityClick(city));
      layer.addLayer(marker);
    });
  }, [cities, showCities, mapFilter, getCityStatus, onCityClick]);

  useEffect(() => {
    const layer = catalogLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    // Experience dots only show when the Experiences layer is switched on.
    if (!showExperiences || mapFilter !== "all") return;

    const locatedItems = catalogItems.filter(
      (item) => Number.isFinite(item.lat) && Number.isFinite(item.lng),
    );
    const visibleItems = activeTags.length === 0
      ? locatedItems
      : locatedItems.filter((item) => activeTags.includes(item.category as ActivityTag));

    visibleItems.forEach((item) => {
      const isFeatured = item.qualityTier === "popular" || item.qualityTier === "editorial";
      const marker = L.circleMarker([item.lat, item.lng], {
        radius: isFeatured ? 5 : 3.5,
        color: "#ffffff",
        weight: isFeatured ? 1.5 : 1,
        fillColor: CATALOG_COLORS[item.category] || DEFAULT_COLOR,
        fillOpacity: isFeatured ? 0.9 : 0.62,
      });
      marker.bindTooltip(
        `<span style="font-weight:600;font-size:12px;">${escapeTooltip(item.name)}</span><br/><span style="font-size:10px;color:#888;">${escapeTooltip(item.city)} · ${escapeTooltip(item.category)}</span>`,
        { direction: "top", offset: [0, -6], className: "city-tooltip" },
      );
      marker.on("click", () => onCatalogItemClick?.(item));
      layer.addLayer(marker);
    });
  }, [catalogItems, showExperiences, mapFilter, activeTags, onCatalogItemClick]);

  useEffect(() => {
    const layer = placeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    // One pin per destination (city). Experiences never get their own pin.
    // Under "All", only cities saved themselves get a pin — saved experiences
    // (a place inside a city) only show when Visited/Wishlist is toggled on.
    const isCityLevel = (p: Place) => !p.city || p.city.toLowerCase() === p.name.toLowerCase();
    let filtered = mapFilter === "all"
      ? places.filter(isCityLevel)
      : places.filter((p) => p.type === mapFilter);
    if (activeTags.length > 0) {
      filtered = filtered.filter(p => placeMatchesTags(p, activeTags));
    }

    const destMap = new Map<string, Place[]>();
    filtered.forEach((place) => {
      const destination = (place.city || place.name).toLowerCase();
      const key = `${destination}||${place.country.toLowerCase()}`;
      if (!destMap.has(key)) destMap.set(key, []);
      destMap.get(key)!.push(place);
    });

    destMap.forEach((destPlaces) => {
      const representative = destPlaces[0];
      const destinationName = representative.city || representative.name;
      const hasVisited = destPlaces.some(p => p.type === "visited");
      const pinType = hasVisited ? "visited" : representative.type as "visited" | "wishlist";
      const matchedCity = cities.find(
        (c) => c.name.toLowerCase() === destinationName.toLowerCase()
          && c.country.toLowerCase() === representative.country.toLowerCase(),
      );
      const city: City = matchedCity || {
        name: destinationName,
        country: representative.country,
        lat: representative.lat,
        lng: representative.lng,
        continent: "",
      };

      const marker = L.marker([city.lat, city.lng], {
        icon: createSavedPinIcon(pinType),
        zIndexOffset: 1000,
      });
      marker.bindTooltip(
        `<span style="font-weight:600;font-size:12px;">${escapeTooltip(city.name)}</span><br/><span style="font-size:10px;color:#888;">${escapeTooltip(city.country)}</span>`,
        { direction: "top", offset: [0, -36], className: "city-tooltip" }
      );
      marker.on("click", () => onCityClick(city));
      layer.addLayer(marker);
    });
  }, [places, cities, mapFilter, activeTags, onCityClick]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default WorldMap;
