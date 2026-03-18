import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { City } from "@/data/cities";
import { Place } from "@/hooks/usePlaces";
import { ExperienceWithPhotos } from "@/hooks/useExperiences";

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

const createPopupContent = (place: Place, experiences: ExperienceWithPhotos[]) => {
  const statusLabel = place.type === "visited" ? "Visited" : "Wishlist";
  const statusColor = place.type === "visited" ? VISITED_COLOR : WISHLIST_COLOR;
  const toggleLabel = place.type === "visited" ? "Move to Wishlist" : "Mark as Visited";

  // Find experiences for this place
  const placeExps = experiences.filter(
    e => e.city?.toLowerCase() === place.name.toLowerCase() ||
         (e.city?.toLowerCase() === place.name.toLowerCase() && e.country?.toLowerCase() === place.country.toLowerCase())
  );

  const expCount = placeExps.length;
  const firstPhoto = placeExps.find(e => e.photos.length > 0)?.photos[0];
  const avgRating = placeExps.filter(e => e.rating > 0).length > 0
    ? (placeExps.reduce((s, e) => s + (e.rating || 0), 0) / placeExps.filter(e => e.rating > 0).length).toFixed(1)
    : null;
  const topTags = [...new Set(placeExps.flatMap(e => e.tags))].slice(0, 3);
  const categories = [...new Set(placeExps.map(e => e.category))].slice(0, 3);

  const photoHtml = firstPhoto
    ? `<img src="${firstPhoto}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
    : "";

  const starsHtml = avgRating
    ? `<div style="display:flex;align-items:center;gap:2px;margin-bottom:6px;">
        ${[1,2,3,4,5].map(n => `<span style="color:${n <= Math.round(Number(avgRating)) ? '#F59E0B' : '#ddd'};font-size:12px;">★</span>`).join("")}
        <span style="font-size:10px;color:#666;margin-left:4px;">${avgRating}</span>
       </div>`
    : "";

  const tagsHtml = topTags.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px;">
        ${topTags.map(t => `<span style="font-size:9px;padding:2px 6px;border-radius:999px;background:#f0f0f0;color:#555;">${t}</span>`).join("")}
       </div>`
    : "";

  const expSummary = expCount > 0
    ? `<div style="font-size:10px;color:#666;margin-bottom:6px;">
        ${expCount} experience${expCount > 1 ? "s" : ""}${categories.length > 0 ? " · " + categories.join(", ") : ""}
       </div>`
    : "";

  // Show latest experience caption
  const latestCaption = placeExps.find(e => e.caption)?.caption;
  const captionHtml = latestCaption
    ? `<div style="font-size:11px;color:#444;margin-bottom:8px;line-height:1.4;font-style:italic;">"${latestCaption.slice(0, 80)}${latestCaption.length > 80 ? "…" : ""}"</div>`
    : "";

  return `
    <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;max-width:260px;padding:4px 0;">
      ${photoHtml}
      <div style="font-weight:600;font-size:14px;margin-bottom:2px;">${place.name}</div>
      <div style="font-size:11px;color:#888;margin-bottom:6px;">${place.country}</div>
      ${starsHtml}
      ${expSummary}
      ${captionHtml}
      ${tagsHtml}
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
  experiences?: ExperienceWithPhotos[];
  showCities: boolean;
  mapFilter: "all" | "visited" | "wishlist";
  onCityClick: (city: City) => void;
  onPlaceClick: (place: Place) => void;
  onTogglePlace?: (place: Place) => void;
  onRemovePlace?: (placeId: string) => void;
}

const WorldMap = ({ cities, places, experiences = [], showCities, mapFilter, onCityClick, onPlaceClick, onTogglePlace, onRemovePlace }: WorldMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cityLayerRef = useRef<L.LayerGroup | null>(null);
  const placeLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFittedRef = useRef(false);

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
      maxBounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
      maxBoundsViscosity: 1.0,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png").addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      pane: "tooltipPane",
    }).addTo(map);

    cityLayerRef.current = L.layerGroup().addTo(map);
    placeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

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
        (p) => p.name.toLowerCase() === city.name.toLowerCase() && p.country.toLowerCase() === city.country.toLowerCase()
      );
      if (match) return match.type as "visited" | "wishlist";
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
    const layer = placeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const filtered = mapFilter === "all" ? places : places.filter((p) => p.type === mapFilter);

    // Group pins by DESTINATION (city), not by individual place name
    // This ensures multiple experiences in the same city produce one pin
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
      // If any place in this destination is visited, show visited pin (priority)
      const hasVisited = destPlaces.some(p => p.type === "visited");
      const pinType = hasVisited ? "visited" : representative.type as "visited" | "wishlist";

      const marker = L.marker([representative.lat, representative.lng], {
        icon: createSavedPinIcon(pinType),
        zIndexOffset: 1000,
      });

      // Build destination-level popup showing all experiences
      marker.bindPopup(createDestinationPopupContent(destinationName, representative.country, destPlaces, experiences, pinType), {
        className: "place-pin-popup",
        closeButton: true,
        maxWidth: 280,
      });

      // Count sub-experiences (exclude city-level saves from label)
      const subExperiences = destPlaces.filter(p => p.name.toLowerCase() !== destinationName.toLowerCase());
      const countLabel = subExperiences.length > 0 ? ` · ${subExperiences.length} experience${subExperiences.length > 1 ? "s" : ""}` : "";
      marker.bindTooltip(
        `<span style="font-weight:600;font-size:12px;">${destinationName}${countLabel}</span><br/><span style="font-size:10px;color:#888;">${representative.country}</span>`,
        { direction: "top", offset: [0, -36], className: "city-tooltip" }
      );

      marker.on("click", () => onPlaceClick(representative));
      layer.addLayer(marker);
    });
  }, [places, experiences, mapFilter, onPlaceClick]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default WorldMap;
