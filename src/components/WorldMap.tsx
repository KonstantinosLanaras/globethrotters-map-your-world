import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { City } from "@/data/cities";
import { Place } from "@/hooks/usePlaces";

const VISITED_COLOR = "hsl(0, 72%, 51%)";
const WISHLIST_COLOR = "hsl(217, 91%, 60%)";
const DEFAULT_COLOR = "hsl(30, 8%, 50%)";

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
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${DEFAULT_COLOR};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2);opacity:0.7;"></div>`,
    className: "city-marker-default",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
};

const createSavedPinIcon = (type: "visited" | "wishlist") => {
  const color = type === "visited" ? VISITED_COLOR : WISHLIST_COLOR;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="13" r="5" fill="white" opacity="0.9"/>
      <circle cx="14" cy="13" r="2.5" fill="${color}"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: type === "visited" ? "saved-pin-visited" : "saved-pin-wishlist",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
};

const createPopupContent = (place: Place) => {
  const statusLabel = place.type === "visited" ? "Visited" : "Wishlist";
  const statusColor = place.type === "visited" ? VISITED_COLOR : WISHLIST_COLOR;
  const toggleLabel = place.type === "visited" ? "Move to Wishlist" : "Mark as Visited";

  return `
    <div style="font-family:Inter,system-ui,sans-serif;min-width:180px;padding:4px 0;">
      <div style="font-weight:600;font-size:14px;margin-bottom:2px;">${place.name}</div>
      <div style="font-size:11px;color:#888;margin-bottom:8px;">${place.country}</div>
      <div style="display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:9999px;background:${statusColor}20;color:${statusColor};margin-bottom:10px;">
        ${statusLabel}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
        <button data-action="toggle" data-place-id="${place.id}" style="cursor:pointer;font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid #ddd;background:white;color:#333;font-weight:500;">
          ${toggleLabel}
        </button>
        <button data-action="remove" data-place-id="${place.id}" style="cursor:pointer;font-size:11px;padding:5px 10px;border-radius:6px;border:1px solid #fee;background:#fff5f5;color:hsl(0,72%,51%);font-weight:500;">
          Remove
        </button>
      </div>
    </div>
  `;
};

interface WorldMapProps {
  cities: City[];
  places: Place[];
  showCities: boolean;
  mapFilter: "all" | "visited" | "wishlist";
  onCityClick: (city: City) => void;
  onPlaceClick: (place: Place) => void;
  onTogglePlace?: (place: Place) => void;
  onRemovePlace?: (placeId: string) => void;
}

const WorldMap = ({ cities, places, showCities, mapFilter, onCityClick, onPlaceClick, onTogglePlace, onRemovePlace }: WorldMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cityLayerRef = useRef<L.LayerGroup | null>(null);
  const placeLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFittedRef = useRef(false);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25, 10],
      zoom: 3,
      minZoom: 2,
      maxZoom: 14,
      scrollWheelZoom: true,
      attributionControl: false,
      worldCopyJump: true,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png").addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      pane: "tooltipPane",
    }).addTo(map);

    cityLayerRef.current = L.layerGroup().addTo(map);
    placeLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Global click handler for popup buttons
    map.getContainer().addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target.dataset.action || !target.dataset.placeId) return;
      
      const placeId = target.dataset.placeId;
      const action = target.dataset.action;
      
      if (action === "remove" && onRemovePlace) {
        onRemovePlace(placeId);
        map.closePopup();
      }
      if (action === "toggle" && onTogglePlace) {
        const place = places.find(p => p.id === placeId);
        if (place) {
          onTogglePlace(place);
          map.closePopup();
        }
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fit map to user's pins on first load
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

  // Helper: find saved status for a city
  const getCityStatus = useCallback(
    (city: City): "none" | "visited" | "wishlist" => {
      const match = places.find(
        (p) =>
          p.name.toLowerCase() === city.name.toLowerCase() &&
          p.country.toLowerCase() === city.country.toLowerCase()
      );
      if (match) return match.type as "visited" | "wishlist";
      return "none";
    },
    [places]
  );

  // Update city markers
  useEffect(() => {
    const layer = cityLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showCities) return;

    cities.forEach((city) => {
      const status = getCityStatus(city);

      // Apply filter — but skip saved cities (they get pins instead)
      if (mapFilter === "visited" && status !== "visited") return;
      if (mapFilter === "wishlist" && status !== "wishlist") return;

      // Don't show city dot for saved places (pin layer handles them)
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

  // Update saved place pins (ALWAYS visible regardless of cities toggle)
  useEffect(() => {
    const layer = placeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const filtered = mapFilter === "all"
      ? places
      : places.filter((p) => p.type === mapFilter);

    filtered.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: createSavedPinIcon(place.type as "visited" | "wishlist"),
        zIndexOffset: 1000,
      });

      marker.bindPopup(createPopupContent(place), {
        className: "place-pin-popup",
        closeButton: true,
        maxWidth: 240,
      });

      marker.bindTooltip(
        `<span style="font-weight:600;font-size:12px;">${place.name}</span><br/><span style="font-size:10px;color:#888;">${place.country}</span>`,
        { direction: "top", offset: [0, -36], className: "city-tooltip" }
      );

      marker.on("click", () => onPlaceClick(place));
      layer.addLayer(marker);
    });
  }, [places, mapFilter, onPlaceClick]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default WorldMap;
