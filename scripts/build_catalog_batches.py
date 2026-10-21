#!/usr/bin/env python3
"""Generate small, reviewable Supabase SQL batches from live OpenStreetMap features.
Run locally: python3 build_catalog_batches.py
No credentials or third-party Python packages needed. Network required for Overpass.
New records are COVERAGE (not editorial recommendations) until independently reviewed.
OpenStreetMap contributors, ODbL: https://www.openstreetmap.org/copyright
"""
from __future__ import annotations
import collections, json, math, pathlib, re, time, unicodedata, urllib.parse, urllib.request

from catalog_match import group_osm_features

OUT = pathlib.Path(__file__).resolve().parent / 'generated_sql'
OUT.mkdir(parents=True, exist_ok=True)
# Bboxes: southern latitude, western longitude, northern latitude, eastern longitude
MARKETS = {
  'barcelona-es': {'bbox': (41.325,2.035,41.475,2.250), 'target':115},
  'madeira-pt': {'bbox': (32.575,-17.285,32.885,-16.640), 'target':80},
}
TAGS = [
 ('culture','museum','tourism','museum'),('culture','gallery','tourism','gallery'),
 ('culture','attraction','tourism','attraction'),('culture','monument','historic','monument'),
 ('culture','castle','historic','castle'),('culture','archaeological_site','historic','archaeological_site'),
 ('culture','theatre','amenity','theatre'),('culture','arts_centre','amenity','arts_centre'),
 ('nature','viewpoint','tourism','viewpoint'),('nature','beach','natural','beach'),
 ('nature','peak','natural','peak'),('nature','waterfall','waterway','waterfall'),
 ('nature','park','leisure','park'),('nature','garden','leisure','garden'),
 ('nature','nature_reserve','leisure','nature_reserve'),
 ('food','restaurant','amenity','restaurant'),('food','cafe','amenity','cafe'),
 ('food','marketplace','amenity','marketplace'),('food','bakery','shop','bakery'),
 ('nightlife','bar','amenity','bar'),('nightlife','pub','amenity','pub'),
 ('nightlife','nightclub','amenity','nightclub'),('nightlife','music_venue','amenity','music_venue'),
]
# Balanced, flexible selection preferences; not hard minimums.
WEIGHTS = {'barcelona-es':{'culture':.35,'food':.30,'nature':.20,'nightlife':.15},
           'madeira-pt':{'nature':.55,'culture':.20,'food':.20,'nightlife':.05}}
EXCLUDE_NAMES = {'parking','car park','toilet','public toilet','information','atm','bank'}

def norm(s):
 s=''.join(x for x in unicodedata.normalize('NFKD',s.casefold()) if not unicodedata.combining(x))
 return re.sub(r'[^a-z0-9]+',' ',s).strip()

def haversine(a,b):
 p1,l1=a;p2,l2=b;r=6371.;d1=math.radians(p2-p1);d2=math.radians(l2-l1)
 return 2*r*math.asin(math.sqrt(math.sin(d1/2)**2+math.cos(math.radians(p1))*math.cos(math.radians(p2))*math.sin(d2/2)**2))

def get_places(market):
 bbox=','.join(map(str,market['bbox']))
 # Two requests per city to be considerate of public Overpass capacity.
 result=[]
 for group in (TAGS[:12],TAGS[12:]):
  selectors=''.join(f'nwr["{key}"="{val}"]["name"]({bbox});' for _,_,key,val in group)
  query='[out:json][timeout:160];('+selectors+');out center tags;'
  data=urllib.parse.urlencode({'data':query}).encode()
  request=urllib.request.Request('https://overpass.kumi.systems/api/interpreter',data=data,headers={'User-Agent':'Globethrotters-Editorial-Recovery/1.0 (noncommercial OSM candidate audit)'})
  last_exc=None
  for attempt in range(3):
   try:
    with urllib.request.urlopen(request,timeout=200) as response: payload=json.load(response)
    break
   except Exception as e:
    last_exc=e;time.sleep(4*(attempt+1))
  else: raise RuntimeError(f'Overpass unavailable: {last_exc}')
  for e in payload.get('elements',[]):
   tags=e.get('tags',{});name=tags.get('name','').strip()
   if not name or norm(name) in EXCLUDE_NAMES:continue
   lat=e.get('lat',e.get('center',{}).get('lat'))
   lon=e.get('lon',e.get('center',{}).get('lon'))
   if lat is None or lon is None:continue
   matches=[(cat,sub) for cat,sub,k,v in group if tags.get(k)==v]
   if not matches:continue
   cat,sub=matches[0]
   result.append({'source_id':f"{e['type']}/{e['id']}",'element_type':e['type'],'feature_type':sub,'name':name,'lat':float(lat),'lon':float(lon),'latitude':float(lat),'longitude':float(lon),'category':cat,'subcategory':sub,'osm_tags':tags})
  time.sleep(2)
 return result

def choose(items,market,slug):
 # Group stable OSM identities first, then same-name/same-type geometry
 # aliases within 20m. Nearby different attractions remain distinct.
 items.sort(key=lambda x:(0 if x['element_type']=='node' else 1, x['name'],x['source_id']))
 unique=[]
 for representations in group_osm_features(items, alias_distance_m=20):
  primary=min(representations,key=lambda x:(0 if x['element_type']=='node' else 1,x['source_id']))
  primary['osm_representation_ids']=sorted({x['source_id'] for x in representations})
  unique.append(primary)
 # Variety-first selection uses destination-specific preferences, not fixed category quotas.
 groups=collections.defaultdict(list)
 for x in unique:groups[x['category']].append(x)
 for category,records in groups.items():
  priority={'museum':0,'gallery':1,'monument':1,'castle':1,'viewpoint':0,'beach':0,'peak':0,'waterfall':0,'nature_reserve':0,'park':1,'garden':1,'restaurant':1,'cafe':2,'bakery':2,'bar':2,'pub':3}
  records.sort(key=lambda x:(priority.get(x['subcategory'],2),norm(x['name']),x['source_id']))
 target=market['target']+45
 wanted={c:round(target*w) for c,w in WEIGHTS[slug].items()}
 chosen=[];used=set()
 for c,limit in wanted.items():
  for x in groups[c][:limit]:chosen.append(x);used.add(x['source_id'])
 leftovers=[x for x in unique if x['source_id'] not in used]
 leftovers.sort(key=lambda x:(-WEIGHTS[slug].get(x['category'],0),norm(x['name'])))
 chosen.extend(leftovers[:max(0,target-len(chosen))])
 return chosen[:target],len(unique)

def make_sql(slug,rows):
 # Twenty records per file; coverage remains hidden until editorial review.
 for idx in range(0,len(rows),20):
  part=rows[idx:idx+20]
  lines=[
   f'-- {slug} OSM candidates {idx+1}-{idx+len(part)}. Review before promotion.',
   f"DO $guard$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.catalog_cities WHERE slug = {q(slug)}) THEN RAISE EXCEPTION 'Missing catalog city {slug}; seed it before import'; END IF; END $guard$;",
   'INSERT INTO public.catalog_items (city_id,source,source_id,name,latitude,longitude,canonical_category,subcategory,source_url,quality_tier,is_active,metadata)',
   "SELECT city.id, v.source, v.source_id, v.name, v.lat, v.lon, v.category, v.subcategory, v.url, 'coverage', true, jsonb_build_object('review_required',true,'batch','osm-recovery-2026-10','osm_representation_ids',v.representation_ids)",
   'FROM public.catalog_cities city',
   'CROSS JOIN (VALUES'
  ]
  vals=[]
  for x in part:
   values=[q('osm'),q(x['source_id']),q(x['name']),str(x['lat']),str(x['lon']),q(x['category']),q(x['subcategory']),q('https://www.openstreetmap.org/'+x['source_id']),q(json.dumps(x['osm_representation_ids']))+'::jsonb']
   vals.append('  ('+', '.join(values)+')')
  lines.append(',\n'.join(vals))
  lines += [
   ') AS v(source,source_id,name,lat,lon,category,subcategory,url,representation_ids)',
   f'WHERE city.slug = {q(slug)}',
   'ON CONFLICT (source,source_id) DO NOTHING;',
   '',
   '-- Verify this batch is present; these rows remain unpublished coverage.',
   'SELECT city.slug AS city_slug, item.canonical_category, count(*) AS rows_present',
   'FROM public.catalog_items item JOIN public.catalog_cities city ON city.id=item.city_id',
   f"WHERE city.slug={q(slug)} AND item.source='osm' AND item.source_id IN ("+', '.join(q(x['source_id']) for x in part)+')',
   'GROUP BY city.slug,item.canonical_category ORDER BY item.canonical_category;'
  ]
  (OUT/f'{slug}_part_{idx//20+1:02}.sql').write_text('\n'.join(lines)+'\n',encoding='utf-8')

def main():
 report={}
 for slug,market in MARKETS.items():
  items=get_places(market)
  selected,unique=choose(items,market,slug)
  if not selected:raise RuntimeError(f'No valid candidates returned for {slug}; SQL not created')
  make_sql(slug,selected)
  report[slug]={'target':market['target'],'raw_features':len(items),'unique_features':unique,'candidate_count':len(selected),'category_counts':dict(collections.Counter(x['category'] for x in selected)),'note':'Candidates are not yet editorial-approved or confirmed deployed.'}
  (OUT/f'{slug}_review.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(report,indent=2))
 (OUT/'report.json').write_text(json.dumps(report,indent=2))
 print('Review candidates; then run short SQL files in alphabetical order. Do not publish coverage automatically.')
if __name__=='__main__':main()