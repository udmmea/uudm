let teams = [
  {name: "Neon Vanguard", logo: "https://via.placeholder.com/40?text=NV"},
  {name: "Quantum Pulse", logo: "https://via.placeholder.com/40?text=QP"},
  {name: "Apex Mirage", logo: "https://via.placeholder.com/40?text=AM"},
  {name: "Shadow Circuit", logo: "https://via.placeholder.com/40?text=SC"},
  {name: "Titan Nova", logo: "https://via.placeholder.com/40?text=TN"},
  {name: "Storm Forge", logo: "https://via.placeholder.com/40?text=SF"},
  {name: "Prism Reapers", logo: "https://via.placeholder.com/40?text=PR"},
  {name: "Ember Knights", logo: "https://via.placeholder.com/40?text=EK"},
  {name: "Valkyrie Crew", logo: "https://via.placeholder.com/40?text=VC"},
  {name: "Celestial Rift", logo: "https://via.placeholder.com/40?text=CR"},
  {name: "Iron Sentinels", logo: "https://via.placeholder.com/40?text=IS"},
  {name: "Solaris Unit", logo: "https://via.placeholder.com/40?text=SU"},
  {name: "Glacier Wolves", logo: "https://via.placeholder.com/40?text=GW"},
  {name: "Nebula Legion", logo: "https://via.placeholder.com/40?text=NL"},
  {name: "Aether Falcons", logo: "https://via.placeholder.com/40?text=AF"},
  {name: "Rogue Titans", logo: "https://via.placeholder.com/40?text=RT"},
  {name: "Vortex Rangers", logo: "https://via.placeholder.com/40?text=VR"},
  {name: "Phantom Core", logo: "https://via.placeholder.com/40?text=PC"},
  {name: "Obsidian Guard", logo: "https://via.placeholder.com/40?text=OG"},
  {name: "Zenith Echo", logo: "https://via.placeholder.com/40?text=ZE"}
];

function findTeamObj(name){
  if(!name) return undefined;
  const lc = name.toLowerCase().trim();
  return teams.find(t => t.name.toLowerCase().trim() === lc);
}

let matches = [];

let weeks = []; // generated dynamically from `teams`

let currentWeek = 0;

function getPlayerSlots(){
  return teams.map((team, index) => ({
    name: team.name,
    telegram: `https://t.me/username${index + 1}`
  }));
}


  // Persistence keys
  const DEL_TEAMS_KEY = 'del_teams_v1';
  const DEL_MATCHES_KEY = 'del_matches_v1';

  function loadState(){
    try{
      const ts = localStorage.getItem(DEL_TEAMS_KEY);
      const ms = localStorage.getItem(DEL_MATCHES_KEY);
      if(ts){
        const parsed = JSON.parse(ts);
        if(Array.isArray(parsed) && parsed.length) teams = parsed;
      }
      if(ms){
        const parsed = JSON.parse(ms);
        if(Array.isArray(parsed)) matches = parsed;
      }
    }catch(e){
      console.warn('Failed to load saved state', e);
    }
    // remove any BYE entries that may exist in saved state
    removeByeEntries();
    // remove any persisted Wolves entries so the team is no longer in the app
    removeTeamByName('Wolves');
  }

  function saveState(){
    try{
      localStorage.setItem(DEL_TEAMS_KEY, JSON.stringify(teams));
      localStorage.setItem(DEL_MATCHES_KEY, JSON.stringify(matches));
    }catch(e){
      console.warn('Failed to save state', e);
    }
  }

  // load persisted state if present
  loadState();

  // BroadcastChannel to sync across tabs
  let delChannel = null;
  try{
    delChannel = new BroadcastChannel('del_channel');
    delChannel.onmessage = (ev)=>{
      if(ev.data && ev.data.type === 'state_updated'){
        loadState();
        // re-render views when another tab updated state
        if(typeof renderTable === 'function') renderTable();
        if(typeof renderFixtures === 'function') renderFixtures();
        if(typeof renderTop5 === 'function') renderTop5();
        if(typeof renderWeekSchedule === 'function') renderWeekSchedule();
      }
    };
  }catch(e){
    delChannel = null;
  }
// --- Admin authentication (client-side only) ---
function isAdmin(){
  try{ return localStorage.getItem('del_admin_auth') === '1'; }catch(e){return false;}
}

function setAdminPasswordInteractive(){
  const pw = prompt('Set admin password (will be stored locally in this browser):');
  if(!pw) return false;
  try{ localStorage.setItem('del_admin_pw', pw); alert('Admin password set.'); return true; }catch(e){alert('Failed to set password'); return false;}
}

function loginAdminInteractive(){
  const pw = prompt('Admin password:');
  const stored = localStorage.getItem('del_admin_pw');
  if(!stored){ alert('No admin password configured. Use "Set admin password" first.'); return false; }
  if(pw === stored){ localStorage.setItem('del_admin_auth','1'); try{ const bc = new BroadcastChannel('del_channel'); bc.postMessage({type:'state_updated'}); bc.close(); }catch(e){} alert('Logged in as admin'); return true; }
  alert('Incorrect password'); return false;
}

function logoutAdmin(){ localStorage.removeItem('del_admin_auth'); try{ const bc = new BroadcastChannel('del_channel'); bc.postMessage({type:'state_updated'}); bc.close(); }catch(e){} }

function updateWeekLabel(){
  const label = document.getElementById('weekLabel');
  if(!label) return;
  label.textContent = `Week ${currentWeek+1} of ${weeks.length}`;
  const heading = document.getElementById('weekHeading');
  if(heading) heading.textContent = `Week ${currentWeek+1} — Match Schedule`;
}

// generate full round-robin schedule based on `teams` (names)
function generateSeasonFixtures(){
  // Standard round-robin generation.
  // For even number of teams (e.g. 20) this produces `teams.length - 1` rounds.
  const names = teams.map(t => t.name);
  const isOdd = names.length % 2 !== 0;
  if (isOdd) names.push('BYE');
  const rounds = names.length - 1;
  const half = names.length / 2;

  let arr = names.slice();
  const allRounds = [];
  for (let r = 0; r < rounds; r++) {
    const fixtures = [];
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[arr.length - 1 - i];
      fixtures.push({ home, away, hg: null, ag: null });
    }
    allRounds.push(fixtures);
    // rotate (keep first fixed)
    arr = [arr[0]].concat(arr.slice(-1)).concat(arr.slice(1, -1));
  }

  // If odd, filter out BYE fixtures from each round (keeps round count intact).
  if (isOdd) {
    return allRounds.map(w => w.filter(f => !isBye(f.home) && !isBye(f.away)));
  }
  return allRounds;
}

function ensureWeeksGenerated(){
  // Generate full season fixtures: for N teams (even) there are N-1 rounds.
  const totalRounds = (teams.length % 2 === 0) ? teams.length - 1 : teams.length;
  if (!Array.isArray(weeks) || weeks.length !== totalRounds) {
    const generated = generateSeasonFixtures();
    // generated already filters BYE fixtures when necessary; ensure exact rounds length
    weeks = generated.slice(0, totalRounds);
  }
}

function isBye(name){
  if(!name) return false;
  return String(name).toLowerCase().trim() === 'bye';
}

function removeTeamByName(teamName){
  if(!teamName) return;
  const lc = teamName.toLowerCase().trim();
  teams = teams.filter(t => t.name.toLowerCase().trim() !== lc);
  matches = matches.filter(m => m.home.toLowerCase().trim() !== lc && m.away.toLowerCase().trim() !== lc);
}

// Remove any BYE teams/matches/fixtures from in-memory state
function removeByeEntries(){
  // remove BYE from teams
  const beforeTeams = teams.length;
  teams = teams.filter(t => !isBye(t.name));
  // remove matches that reference BYE
  const beforeMatches = matches.length;
  matches = matches.filter(m => !isBye(m.home) && !isBye(m.away));
  // remove fixtures in weeks that contain BYE
  if(Array.isArray(weeks)){
    weeks = weeks.map(w => Array.isArray(w) ? w.filter(f => !isBye(f.home) && !isBye(f.away)) : w).filter(w => Array.isArray(w) ? w.length>0 : true);
  }
  if(teams.length !== beforeTeams || matches.length !== beforeMatches){
    try{ saveState(); }catch(e){}
  }
}

function computeTableData() {
  let tableData = teams.map(t => ({
    name: t.name,
    logo: t.logo || '',
    P: 0,
    W: 0,
    D: 0,
    L: 0,
    GF: 0,
    GA: 0,
    GD: 0,
    PTS: 0
  }));

  function getTeam(name) {
    if(!name) return undefined;
    const lc = name.toLowerCase().trim();
    return tableData.find(t => t.name.toLowerCase().trim() === lc);
  }

    // Only include matches that are not hidden, unless viewer is admin
    const matchesToCount = (typeof isAdmin === 'function' && isAdmin()) ? matches : matches.filter(m => !m.hidden);
    matchesToCount.forEach(m => {
    let home = getTeam(m.home);
    let away = getTeam(m.away);
    if (!home || !away) return;

    home.P++; away.P++;

    home.GF += Number(m.hg);
    home.GA += Number(m.ag);
    away.GF += Number(m.ag);
    away.GA += Number(m.hg);

    if (m.hg > m.ag) {
      home.W++; away.L++; home.PTS += 3;
    } else if (m.hg < m.ag) {
      away.W++; home.L++; away.PTS += 3;
    } else {
      home.D++; away.D++; home.PTS++; away.PTS++;
    }
  });

  tableData.forEach(t => t.GD = t.GF - t.GA);
  tableData.sort((a, b) => b.PTS - a.PTS || b.GD - a.GD || b.GF - a.GF);

  return tableData;
}

function getSearchTerm() {
  const searchInput = document.getElementById('teamSearch');
  return searchInput ? searchInput.value.toLowerCase().trim() : '';
}

function applyTeamSearch(){
  renderTable();
  renderTop5();
}

function renderTable() {
  let table = document.getElementById("table");
  if (!table) return;
  const searchTerm = getSearchTerm();
  const tableData = computeTableData();
  const filtered = searchTerm ? tableData.filter(t => t.name.toLowerCase().includes(searchTerm)) : tableData;

  if (filtered.length === 0) {
    table.innerHTML = `<tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr><tr><td colspan="9" style="text-align:center;padding:16px;color:#cbd5e1;">No matching teams found.</td></tr>`;
    return;
  }

  table.innerHTML = `<tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>` +
    filtered.map(t =>
      `<tr><td><img src="${t.logo || ''}" alt="${t.name}" style="width:28px;height:28px;vertical-align:middle;border-radius:4px;margin-right:8px;"> ${t.name}</td><td>${t.P}</td><td>${t.W}</td><td>${t.D}</td><td>${t.L}</td><td>${t.GF}</td><td>${t.GA}</td><td>${t.GD}</td><td>${t.PTS}</td></tr>`
    ).join("");
}

function renderFixtures() {
  let fixtures = document.getElementById("fixtures");
  if (!fixtures) return;
  const previewEl = document.getElementById('matchPreview');
  if(matches.length === 0){
    if(previewEl) previewEl.innerHTML = '<em>No matches yet</em>';
    fixtures.innerHTML = '';
    return;
  }
  const visibleMatches = matches.filter(m => !isBye(m.home) && !isBye(m.away));
  if(visibleMatches.length === 0){
    if(previewEl) previewEl.innerHTML = '<em>No matches yet</em>';
    fixtures.innerHTML = '';
    return;
  }

  const last = visibleMatches[visibleMatches.length - 1];
  const homeLast = findTeamObj(last.home) || {};
  const awayLast = findTeamObj(last.away) || {};
  if(previewEl){
    previewEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;">
          <img src="${homeLast.logo||''}" style="width:48px;height:48px;border-radius:6px;margin-right:10px;"> 
          <div style="font-weight:bold">${last.home}</div>
        </div>
        <div style="font-size:28px;font-weight:700">${last.hg}-${last.ag}</div>
        <div style="display:flex;align-items:center;">
          <div style="font-weight:bold;margin-right:10px">${last.away}</div>
          <img src="${awayLast.logo||''}" style="width:48px;height:48px;border-radius:6px;">
        </div>
      </div>
    `;
  }

  const others = visibleMatches.slice(0, -1);
  if(others.length === 0){
    fixtures.innerHTML = '<em>No other matches</em>';
  } else {
    fixtures.innerHTML = others.map(m => {
      const home = findTeamObj(m.home) || {};
      const away = findTeamObj(m.away) || {};
      const score = (m.hg !== null && m.ag !== null) ? `${m.hg}-${m.ag}` : 'vs';
      const details = (m.hg !== null && m.ag !== null) ? ` <div style="font-size:12px;color:#9ca3af;">${(m.homeScorers||[]).join(', ')}${(m.homeAssists||[]).length?(' (A: '+m.homeAssists.join(', ')+')'):''} — ${ (m.awayScorers||[]).join(', ')}${(m.awayAssists||[]).length?(' (A: '+m.awayAssists.join(', ')+')'):''}</div>` : '';
      return `<div style="margin-bottom:6px;"><img src="${home.logo||''}" style="width:20px;height:20px;vertical-align:middle;margin-right:6px;border-radius:3px;"> ${m.home} ${score} <img src="${away.logo||''}" style="width:20px;height:20px;vertical-align:middle;margin-left:6px;margin-right:6px;border-radius:3px;"> ${m.away}${details}</div>`;
    }).join("");
  }
}

// initial render
renderTable();
renderFixtures();

function renderTop5(){
  const topEl = document.getElementById('top5');
  if(!topEl) return;
  const searchTerm = getSearchTerm();
  const tableData = computeTableData();
  const filtered = searchTerm ? tableData.filter(t => t.name.toLowerCase().includes(searchTerm)) : tableData;
  const topList = filtered.slice(0,5);

  if(topList.length === 0){
    topEl.innerHTML = '<div style="color:#cbd5e1;">No matching teams found.</div>';
    return;
  }

  topEl.innerHTML = topList.map(t=>
    `<div style="display:flex;align-items:center;margin-bottom:8px;"><img src="${t.logo||''}" alt="${t.name}" style="width:30px;height:30px;border-radius:4px;margin-right:8px;"> <strong style="margin-right:8px;">${t.name}</strong> <span style="color:#9ca3af">${t.PTS} pts</span></div>`
  ).join('');
}

function renderPlayerSlots(){
  const slotContainer = document.getElementById('playerSlots');
  if(!slotContainer) return;
  const slots = getPlayerSlots();
  slotContainer.innerHTML = slots.map(slot =>
    `<a class="player-item" href="${slot.telegram}" target="_blank" rel="noreferrer noopener">
      <div>
        <strong>${slot.name}</strong>
        <p>Open Telegram</p>
      </div>
      <span>➡</span>
    </a>`
  ).join('');
}

renderTop5();
renderPlayerSlots();

function renderWeekSchedule(weekIndex = currentWeek){
  ensureWeeksGenerated();
  if(weekIndex < 0) weekIndex = 0;
  if(weekIndex >= weeks.length) weekIndex = weeks.length - 1;
  currentWeek = weekIndex;
  updateWeekLabel();
  const el = document.getElementById('weekSchedule');
  if(!el) return;
  const week = weeks[weekIndex] || [];
  const filteredWeek = (week || []).filter(m => !isBye(m.home) && !isBye(m.away));
  if(filteredWeek.length === 0){ el.innerHTML = '<em>No scheduled matches for this week.</em>'; return; }

  el.innerHTML = filteredWeek.map(m => {
    const home = findTeamObj(m.home) || {};
    const away = findTeamObj(m.away) || {};
    const score = (m.hg !== null && m.ag !== null) ? `<span style="font-weight:700">${m.hg}-${m.ag}</span>` : '<span style="color:#9ca3af">vs</span>';
    const details = (m.hg !== null && m.ag !== null) ? `
      <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">
        ${m.homeScorers && m.homeScorers.length ? '<div><strong>Scorers:</strong> ' + m.homeScorers.join(', ') + '</div>' : ''}
        ${m.awayScorers && m.awayScorers.length ? '<div><strong>Scorers:</strong> ' + m.awayScorers.join(', ') + '</div>' : ''}
        ${m.homeAssists && m.homeAssists.length ? '<div><strong>Assists:</strong> ' + m.homeAssists.join(', ') + '</div>' : ''}
        ${m.awayAssists && m.awayAssists.length ? '<div><strong>Assists:</strong> ' + m.awayAssists.join(', ') + '</div>' : ''}
      </div>
    ` : '';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #2b2b2b;">
        <div style="display:flex;align-items:center;">
          <img src="${home.logo||''}" style="width:28px;height:28px;border-radius:4px;margin-right:8px;"> <strong>${m.home}</strong>
        </div>
        <div>${score}</div>
        <div style="display:flex;align-items:center;">
          <strong style="margin-right:8px;">${m.away}</strong> <img src="${away.logo||''}" style="width:28px;height:28px;border-radius:4px;margin-left:8px;">
        </div>
      </div>
      ${details}
    `;
  }).join('');
}

renderWeekSchedule(0);

function nextWeek(){
  ensureWeeksGenerated();
  if(currentWeek < weeks.length - 1) currentWeek++;
  renderWeekSchedule(currentWeek);
}

function prevWeek(){
  if(currentWeek > 0) currentWeek--;
  renderWeekSchedule(currentWeek);
}

// fetch high-resolution crests from Wikipedia Media API and update logos when available
async function fetchLogos(){
  const promises = teams.map(async team => {
    if(!team.wikiTitle) return;
    try{
      const resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/media/${encodeURIComponent(team.wikiTitle)}`);
      if(!resp.ok) return;
      const j = await resp.json();
      if(!j || !Array.isArray(j.items)) return;

      // find first image item (usually the club crest)
      const imgItem = j.items.find(it => it.type === 'image');
      if(!imgItem) return;

      // prefer original -> src -> largest srcset entry
      if(imgItem.original && imgItem.original.source){
        team.logo = imgItem.original.source;
      } else if(imgItem.src){
        team.logo = imgItem.src;
      } else if(imgItem.srcset && imgItem.srcset.length){
        const best = imgItem.srcset.reduce((a,b)=> (a.width||0) > (b.width||0) ? a : b);
        team.logo = best.src;
      }
    }catch(e){
      // ignore network/parse errors and keep placeholder
    }
  });
  await Promise.all(promises);
  // re-render after fetching
  renderTable();
  renderFixtures();
  if(typeof renderTop5 === 'function') renderTop5();
}

fetchLogos();

// apply a match result to the weekly schedule (if fixture exists)
function applyResultToSchedule(home, away, hg, ag, details){
  for(const week of weeks){
    for(const fixture of week){
      if((fixture.home||'').toLowerCase().trim() === (home||'').toLowerCase().trim() && (fixture.away||'').toLowerCase().trim() === (away||'').toLowerCase().trim()){
        fixture.hg = Number(hg);
        fixture.ag = Number(ag);
        if(details){
          fixture.homeScorers = details.homeScorers || [];
          fixture.awayScorers = details.awayScorers || [];
          fixture.homeAssists = details.homeAssists || [];
          fixture.awayAssists = details.awayAssists || [];
        }
        // re-render schedule
        if(typeof renderWeekSchedule === 'function') renderWeekSchedule();
        return true;
      }
    }
  }
  return false;
}

function removeResultFromSchedule(home, away){
  for(const week of weeks){
    for(const fixture of week){
      if((fixture.home||'').toLowerCase().trim() === (home||'').toLowerCase().trim() && (fixture.away||'').toLowerCase().trim() === (away||'').toLowerCase().trim()){
        fixture.hg = null;
        fixture.ag = null;
        delete fixture.homeScorers;
        delete fixture.awayScorers;
        delete fixture.homeAssists;
        delete fixture.awayAssists;
        if(typeof renderWeekSchedule === 'function') renderWeekSchedule();
        return true;
      }
    }
  }
  return false;
}
