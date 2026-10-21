[out:json][timeout:90];
{{geocodeArea:Madeira, Portugal}}->.searchArea;
(
  relation(area.searchArea)["route"~"hiking|foot"];
  nwr(area.searchArea)["tourism"="viewpoint"];
  nwr(area.searchArea)["natural"="beach"];
  nwr(area.searchArea)["leisure"="nature_reserve"];
  nwr(area.searchArea)["tourism"="attraction"];
);
out tags center geom;
