import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { City } from "@/data/cities";
import { Place } from "@/hooks/usePlaces";

const createCityIcon = (status: "none" | "visited" | "wishlist") => {
  if (status === "visited") {
    return L.divIcon({
      html: `<div style="width:14px;height:14px;border-radius:50%;background:hsl(24,75%,50%);border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
      className: "city-marker-visited",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }
  if (status === "wishlist") {
    return L.divIcon({
      html: `<div style="width:14px;height:14px;border-radius:50%;background:hsl(210,30%,55%);border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
      className: "city-marker-wishlist",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }
  return L.divIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;background:hsl(30,8%,50%);border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.2);opacity:0.7;"></div>`,
    className: "city-marker-default",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
};

const createSavedPinIcon = (type: "visited" | "wishlist") => {
  const color = type === "visited" ? "hsl(24,75%,50%)" : "hsl(210,30%,55%)";
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

interface WorldMapProps {
  cities: City[];
  places: Place[];
  showCities: boolean;
  mapFilter: "all" | "visited" | "wishlist";
  onCityClick: (city: City) => void;
  onPlaceClick: (place: Place) => void;
}

const WorldMap = ({ cities, places, showCities, mapFilter, onCityClick, onPlaceClick }: WorldMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cityLayerRef = useRef<L.LayerGroup | null>(null);
  const placeLayerRef = useRef<L.LayerGroup | null>(null);

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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

      // Apply filter
      if (mapFilter === "visited" && status !== "visited") return;
      if (mapFilter === "wishlist" && status !== "wishlist") return;

      const marker = L.marker([city.lat, city.lng], {
        icon: createCityIcon(status),
        zIndexOffset: status !== "none" ? 500 : 0,
      });

      marker.bindTooltip(
        `<span style="font-weight:600;font-size:12px;">${city.name}</span><br/><span style="font-size:10px;color:#888;">${city.country}</span>`,
        { direction: "top", offset: [0, -8], className: "city-tooltip" }
      );

      marker.on("click", () => onCityClick(city));
      layer.addLayer(marker);
    });
  }, [cities, showCities, mapFilter, getCityStatus, onCityClick]);

  // Update saved place pins (always visible)
  useEffect(() => {
    const layer = placeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    // When cities layer is on, we show city dots instead of pins
    if (showCities) return;

    const filtered = mapFilter === "all"
      ? places
      : places.filter((p) => p.type === mapFilter);

    filtered.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: createSavedPinIcon(place.type as "visited" | "wishlist"),
      });

      marker.bindTooltip(
        `<span style="font-weight:600;font-size:12px;">${place.name}</span><br/><span style="font-size:10px;color:#888;">${place.country}</span>`,
        { direction: "top", offset: [0, -36], className: "city-tooltip" }
      );

      marker.on("click", () => onPlaceClick(place));
      layer.addLayer(marker);
    });
  }, [places, showCities, mapFilter, onPlaceClick]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default WorldMap;
