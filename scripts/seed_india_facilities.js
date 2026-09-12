/**
 * scripts/seed_india_facilities.js
 * 
 * Fetches healthcare facilities from OpenStreetMap across India
 * and batch upserts them into your Supabase `facilities` table.
 * 
 * Usage:
 *   # 1. Update existing demo Khandwa facilities with real coordinates
 *   node --env-file=.env scripts/seed_india_facilities.js --demo-khandwa
 * 
 *   # 2. Seed a specific state (e.g. Delhi or Madhya Pradesh)
 *   node --env-file=.env scripts/seed_india_facilities.js --state="Delhi"
 *   node --env-file=.env scripts/seed_india_facilities.js --state="Madhya Pradesh"
 * 
 *   # 3. Seed top Indian states across the country
 *   node --env-file=.env scripts/seed_india_facilities.js --all
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ISO-3166-2 Codes and City Queries for OpenStreetMap
const STATE_ISO_MAP = {
  'mumbai': {
    name: 'Mumbai',
    state: 'Maharashtra',
    district: 'Mumbai',
    customQuery: `
      area["name"="Mumbai Suburban"]->.suburban;
      area["name"="Mumbai"]->.city;
      (
        node["amenity"~"^(hospital|clinic|doctors)$"](area.suburban);
        way["amenity"~"^(hospital|clinic|doctors)$"](area.suburban);
        node["healthcare"~"^(hospital|clinic|centre|doctor)$"](area.suburban);
        way["healthcare"~"^(hospital|clinic|centre)$"](area.suburban);
        node["amenity"~"^(hospital|clinic|doctors)$"](area.city);
        way["amenity"~"^(hospital|clinic|doctors)$"](area.city);
        node["healthcare"~"^(hospital|clinic|centre|doctor)$"](area.city);
        way["healthcare"~"^(hospital|clinic|centre)$"](area.city);
      );
    `
  },
  'delhi': { name: 'Delhi', iso: 'IN-DL' },
  'madhya pradesh': { name: 'Madhya Pradesh', iso: 'IN-MP' },
  'maharashtra': { name: 'Maharashtra', iso: 'IN-MH' },
  'karnataka': { name: 'Karnataka', iso: 'IN-KA' },
  'uttar pradesh': { name: 'Uttar Pradesh', iso: 'IN-UP' },
  'tamil nadu': { name: 'Tamil Nadu', iso: 'IN-TN' },
  'gujarat': { name: 'Gujarat', iso: 'IN-GJ' },
  'rajasthan': { name: 'Rajasthan', iso: 'IN-RJ' },
  'west bengal': { name: 'West Bengal', iso: 'IN-WB' },
  'telangana': { name: 'Telangana', iso: 'IN-TG' },
  'kerala': { name: 'Kerala', iso: 'IN-KL' },
  'punjab': { name: 'Punjab', iso: 'IN-PB' },
  'haryana': { name: 'Haryana', iso: 'IN-HR' },
  'bihar': { name: 'Bihar', iso: 'IN-BR' },
  'odisha': { name: 'Odisha', iso: 'IN-OR' },
  'assam': { name: 'Assam', iso: 'IN-AS' },
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function mapAmenityToType(tags) {
  const name = (tags.name || '').toLowerCase();
  const amenity = tags.amenity || '';
  const healthcare = tags.healthcare || '';

  if (name.includes('district hospital') || name.includes('civil hospital') || name.includes('medical college')) {
    return 'district_hospital';
  }
  if (name.includes('community health') || name.includes('chc') || name.includes('rural hospital')) {
    return 'rural_hospital';
  }
  if (name.includes('primary health') || name.includes('phc') || name.includes('dispensary')) {
    return 'phc';
  }
  if (name.includes('sub centre') || name.includes('sub-center') || name.includes('subcenter') || name.includes('arogya')) {
    return 'sub_centre';
  }

  if (amenity === 'hospital' || healthcare === 'hospital') return 'district_hospital';
  if (amenity === 'clinic' || healthcare === 'clinic') return 'rural_hospital';
  if (amenity === 'doctors' || healthcare === 'doctor') return 'phc';
  return 'phc';
}

async function fetchFromOverpass(stateMeta) {
  const innerQuery = stateMeta.customQuery
    ? stateMeta.customQuery
    : `
      area["ISO3166-2"="${stateMeta.iso}"]->.searchArea;
      (
        node["amenity"~"^(hospital|clinic|doctors)$"](area.searchArea);
        way["amenity"~"^(hospital|clinic|doctors)$"](area.searchArea);
        node["healthcare"~"^(hospital|clinic|centre|doctor)$"](area.searchArea);
        way["healthcare"~"^(hospital|clinic|centre)$"](area.searchArea);
      );
    `;

  const query = `
    [out:json][timeout:60];
    ${innerQuery}
    out center tags 500;
  `;

  const res = await axios.post(
    OVERPASS_URL,
    'data=' + encodeURIComponent(query),
    {
      headers: {
        'User-Agent': 'CareConnectHealthcareApp/1.0',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 60000
    }
  );

  return res.data?.elements || [];
}

async function seedState(stateKey) {
  const stateMeta = STATE_ISO_MAP[stateKey.toLowerCase()];
  if (!stateMeta) {
    console.warn(`Unknown state: "${stateKey}". Available: ${Object.keys(STATE_ISO_MAP).join(', ')}`);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`[OSM Seeder] Fetching facilities for ${stateMeta.name} (${stateMeta.iso || 'City'})...`);
  console.log(`======================================================`);

  try {
    const rawElements = await fetchFromOverpass(stateMeta);
    console.log(`Fetched ${rawElements.length} raw elements from OpenStreetMap.`);

    const records = [];
    const seen = new Set();

    for (const el of rawElements) {
      const lat = el.lat || el.center?.lat;
      const lng = el.lon || el.center?.lon;
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || tags['name:hi'];

      if (!lat || !lng || !name) continue;

      const osmId = `${el.type}/${el.id}`;
      if (seen.has(osmId)) continue;
      seen.add(osmId);

      const type = mapAmenityToType(tags);
      const district = tags['addr:district'] || tags['addr:city'] || tags['addr:subdistrict'] || stateMeta.name;

      records.push({
        osm_id: osmId,
        name: name.trim(),
        type: type,
        status: 'operational',
        lat: parseFloat(lat.toFixed(7)),
        lng: parseFloat(lng.toFixed(7)),
        district: district.trim(),
        state: stateMeta.name,
        address: tags['addr:full'] || tags['addr:street'] || `${name.trim()}, ${district}, ${stateMeta.name}`,
        phone: tags.phone || tags['contact:phone'] || null,
        emergency_available: tags.emergency === 'yes' || type === 'district_hospital',
        beds: tags['capacity:beds'] ? parseInt(tags['capacity:beds'], 10) : (type === 'district_hospital' ? 100 : 15),
        capacity: 100,
        services: tags.healthcare ? [tags.healthcare] : ['General OPD']
      });
    }

    console.log(`Prepared ${records.length} formatted healthcare facilities.`);

    // Batch upsert in chunks of 100
    const CHUNK_SIZE = 100;
    let savedCount = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('facilities')
        .upsert(chunk, { onConflict: 'osm_id' });

      if (error) {
        console.error(`  Batch error [${i}..${i + chunk.length}]:`, error.message);
      } else {
        savedCount += chunk.length;
        console.log(`  Upserted ${savedCount}/${records.length} facilities...`);
      }
    }

    console.log(`Successfully saved ${savedCount} facilities in ${stateMeta.name}!`);
  } catch (err) {
    console.error(`Failed to seed ${stateMeta.name}:`, err.message);
  }
}

async function updateDemoKhandwa() {
  console.log('\n[Demo Seeder] Updating Khandwa demo facilities with coordinates...');
  
  const updates = [
    { name: 'PHC Khandwa', lat: 21.8150, lng: 76.3620, district: 'Khandwa', state: 'Madhya Pradesh' },
    { name: 'District Hospital Khandwa', lat: 21.8312, lng: 76.3488, district: 'Khandwa City', state: 'Madhya Pradesh' },
    { name: 'CHC Sanawad', lat: 22.1797, lng: 76.0664, district: 'Sanawad', state: 'Madhya Pradesh' },
    { name: 'Sub-Centre Rampur', lat: 21.8600, lng: 76.4100, district: 'Rampur', state: 'Madhya Pradesh' },
    { name: 'DEMO - CareConnect PHC', lat: 21.8220, lng: 76.3550, district: 'Khandwa', state: 'Madhya Pradesh' },
    { name: 'DEMO - Referral Hospital', lat: 21.8380, lng: 76.3400, district: 'Khandwa', state: 'Madhya Pradesh' },
  ];

  for (const u of updates) {
    const { data, error } = await supabase
      .from('facilities')
      .update({ lat: u.lat, lng: u.lng, state: u.state, district: u.district })
      .ilike('name', `%${u.name}%`);

    if (error) {
      console.error(`  Error updating ${u.name}:`, error.message);
    } else {
      console.log(`  Updated coordinates for ${u.name} -> (${u.lat}, ${u.lng})`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--demo-khandwa')) {
    await updateDemoKhandwa();
    return;
  }

  const stateArg = args.find(a => a.startsWith('--state='));
  if (stateArg) {
    const stateName = stateArg.replace('--state=', '').replace(/['"]/g, '');
    await seedState(stateName);
    return;
  }

  if (args.includes('--all')) {
    console.log('Seeding all top Indian states sequentially...');
    const states = ['Delhi', 'Madhya Pradesh', 'Maharashtra', 'Karnataka', 'Uttar Pradesh'];
    for (const st of states) {
      await seedState(st);
      console.log('Pausing 3s before next state...');
      await new Promise(r => setTimeout(r, 3000));
    }
    await updateDemoKhandwa();
    console.log('\nAll states seeded successfully!');
    return;
  }

  // Default if run with no args: seed Delhi & update Khandwa demo
  console.log('No specific state specified.');
  console.log('Running quick start: Seeding Delhi + Khandwa demo coordinates...');
  await updateDemoKhandwa();
  await seedState('Delhi');
  console.log('\nTip: Run with --all or --state="Maharashtra" to seed other states!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
