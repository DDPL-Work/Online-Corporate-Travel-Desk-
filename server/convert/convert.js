const fs = require('fs');

// 1. Read the raw file
const raw = fs.readFileSync('airlines.dat', 'utf-8');
const lines = raw.trim().split('\n');
const headers = ['id', 'name', 'alias', 'iata', 'icao', 'callsign', 'country', 'active'];

// 2. Safe CSV parser (handles quotes & commas inside fields)
function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { 
      result.push(current); 
      current = ''; 
    }
    else current += char;
  }
  result.push(current);
  return result;
}

// 3. Convert to JSON
const airlines = lines.map(line => {
  const cols = parseCSVLine(line);
  const obj = {};
  headers.forEach((key, i) => {
    let val = (cols[i] || '').trim().replace(/^"|"$/g, ''); // strip quotes
    obj[key] = (val === '\\N' || val === '') ? null : val;   // \N → null
  });
  return obj;
});

// 4. FILTER: Keep only airlines with valid IATA codes
const airlinesWithIATA = airlines.filter(airline => 
  airline.iata && airline.iata.trim() !== '' && airline.iata !== 'null'
);

// 5. Write filtered output
fs.writeFileSync('airlines_iata_only.json', JSON.stringify(airlinesWithIATA, null, 2));
console.log(`✅ Done! Converted ${airlinesWithIATA.length} airlines with IATA codes → airlines_iata_only.json`);
console.log(`📊 Skipped ${airlines.length - airlinesWithIATA.length} airlines without IATA codes`);