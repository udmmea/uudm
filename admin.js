function render(){
  let list=document.getElementById("list");
  if(!list) return;

  populateTeamSelects();

  list.innerHTML = matches.map((m, idx) => {
    const score = (m.hg !== null && m.hg !== undefined) ? `${m.hg}-${m.ag}` : 'vs';
    const details = (m.homeScorers||[]).length || (m.awayScorers||[]).length ?
      `<div style="font-size:12px;color:#9ca3af">Scorers: ${ (m.homeScorers||[]).join(', ') } — ${ (m.awayScorers||[]).join(', ') }</div>` : '';
    return `<div style="margin-bottom:8px;padding:6px;border-bottom:1px solid #222;display:flex;align-items:center;justify-content:space-between;"><div><strong>${m.home}</strong> ${score} <strong>${m.away}</strong>${details}</div><div><button onclick="deleteMatch(${idx})" style="background:#ff6b6b;color:white;border:none;padding:6px 8px;border-radius:6px;">Delete</button></div></div>`;
  }).join("");
}
render();

// populate home/away selects from `teams`
function populateTeamSelects(){
  const homeSel = document.getElementById('home');
  const awaySel = document.getElementById('away');
  if(!homeSel || !awaySel) return;
  const prevHome = homeSel.value;
  const prevAway = awaySel.value;
  homeSel.innerHTML = '<option value="">Select home team</option>';
  awaySel.innerHTML = '<option value="">Select away team</option>';
  teams.forEach(t => {
    const opt1 = document.createElement('option'); opt1.value = t.name; opt1.textContent = t.name; homeSel.appendChild(opt1);
    const opt2 = document.createElement('option'); opt2.value = t.name; opt2.textContent = t.name; awaySel.appendChild(opt2);
  });
  if(prevHome) homeSel.value = prevHome;
  if(prevAway) awaySel.value = prevAway;
}

function showMessage(msg, isError = true){
  const el = document.getElementById('error');
  if(!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#ff6b6b' : '#8be9a1';
  if(msg){
    setTimeout(()=>{ el.textContent = ''; }, 3000);
  }
}

function addMatch(){
  const addBtn = document.getElementById('addBtn');
  if(addBtn) addBtn.disabled = true;

  let home=document.getElementById("home").value.trim();
  let away=document.getElementById("away").value.trim();
  let hgRaw=document.getElementById("hg").value;
  let agRaw=document.getElementById("ag").value;
  let homeScorersRaw = document.getElementById("homeScorers") ? document.getElementById("homeScorers").value : '';
  let awayScorersRaw = document.getElementById("awayScorers") ? document.getElementById("awayScorers").value : '';
  let homeAssistsRaw = document.getElementById("homeAssists") ? document.getElementById("homeAssists").value : '';
  let awayAssistsRaw = document.getElementById("awayAssists") ? document.getElementById("awayAssists").value : '';

  if(!home || !away){ showMessage('Please select both teams.'); if(addBtn) addBtn.disabled = false; return; }
  // canonicalize team names (case-insensitive match against known teams)
  function findCanonical(name){
    const found = teams.find(t=>t.name.toLowerCase()===name.toLowerCase());
    return found ? found.name : name;
  }
  home = findCanonical(home);
  away = findCanonical(away);
  if(home === away){ showMessage('Home and Away cannot be the same team.'); if(addBtn) addBtn.disabled = false; return; }

  let hg = parseInt(hgRaw, 10);
  let ag = parseInt(agRaw, 10);
  if(Number.isNaN(hg) || hg < 0){ showMessage('Home goals must be 0 or a positive number.'); if(addBtn) addBtn.disabled = false; return; }
  if(Number.isNaN(ag) || ag < 0){ showMessage('Away goals must be 0 or a positive number.'); if(addBtn) addBtn.disabled = false; return; }

  // parse scorers/assists into arrays
  function parseList(s){
    return s.split(',').map(x=>x.trim()).filter(x=>x.length>0);
  }
  const homeScorers = parseList(homeScorersRaw);
  const awayScorers = parseList(awayScorersRaw);
  const homeAssists = parseList(homeAssistsRaw);
  const awayAssists = parseList(awayAssistsRaw);

  matches.push({home,away,hg,ag,homeScorers,awayScorers,homeAssists,awayAssists});

  // add new teams if they don't exist
  if(!teams.find(t=>t.name.toLowerCase()===home.toLowerCase())) teams.push({name:home, logo: makePlaceholderLogo(home)});
  if(!teams.find(t=>t.name.toLowerCase()===away.toLowerCase())) teams.push({name:away, logo: makePlaceholderLogo(away)});

  // apply result and details to schedule if fixture exists
  if(typeof applyResultToSchedule === 'function') applyResultToSchedule(home, away, hg, ag, {homeScorers, awayScorers, homeAssists, awayAssists});

  // persist state to localStorage and notify other tabs
  try{
    localStorage.setItem('del_teams_v1', JSON.stringify(teams));
    localStorage.setItem('del_matches_v1', JSON.stringify(matches));
    try{ if(typeof BroadcastChannel !== 'undefined'){ const bc = new BroadcastChannel('del_channel'); bc.postMessage({type:'state_updated'}); bc.close(); } }catch(e){}
  }catch(e){ console.warn('Could not persist state', e); }

  render();
  if(typeof renderTable === 'function') renderTable();
  if(typeof renderFixtures === 'function') renderFixtures();
  if(typeof renderTop5 === 'function') renderTop5();
  if(typeof renderWeekSchedule === 'function') renderWeekSchedule();

  showMessage('Match added.', false);

  // clear inputs
  const homeSel = document.getElementById('home');
  const awaySel = document.getElementById('away');
  if(homeSel) homeSel.selectedIndex = 0;
  if(awaySel) awaySel.selectedIndex = 0;
  document.getElementById("hg").value="";
  document.getElementById("ag").value="";

  if(addBtn) addBtn.disabled = false;
}

function makePlaceholderLogo(name){
  // create 3-letter initials for placeholder
  const initials = name.split(/\s+/).map(w=>w[0]).join('').substring(0,3).toUpperCase();
  return `https://via.placeholder.com/40?text=${encodeURIComponent(initials)}`;
}

function deleteMatch(index){
  const m = matches[index];
  if(!m) return;
  if(!confirm(`Delete match: ${m.home} ${m.hg || ''}-${m.ag || ''} ${m.away}?`)) return;
  matches.splice(index,1);
  if(typeof removeResultFromSchedule === 'function') removeResultFromSchedule(m.home, m.away);
  try{
    localStorage.setItem('del_teams_v1', JSON.stringify(teams));
    localStorage.setItem('del_matches_v1', JSON.stringify(matches));
    try{ if(typeof BroadcastChannel !== 'undefined'){ const bc = new BroadcastChannel('del_channel'); bc.postMessage({type:'state_updated'}); bc.close(); } }catch(e){}
  }catch(e){ console.warn('Could not persist state', e); }
  render();
  if(typeof renderTable === 'function') renderTable();
  if(typeof renderFixtures === 'function') renderFixtures();
  if(typeof renderTop5 === 'function') renderTop5();
  if(typeof renderWeekSchedule === 'function') renderWeekSchedule();
}

// Export current teams/matches to a JSON file for sharing or backup
function exportState(){
  try{
    const data = { teams, matches };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'league-state.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }catch(e){
    showMessage('Export failed');
  }
}

// Import state from selected file (called by file input onchange)
function handleImport(input){
  const f = input.files && input.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const parsed = JSON.parse(e.target.result);
      if(parsed.teams && parsed.matches){
        // basic validation
        teams = parsed.teams;
        matches = parsed.matches;
        // persist and broadcast
        try{ localStorage.setItem('del_teams_v1', JSON.stringify(teams)); localStorage.setItem('del_matches_v1', JSON.stringify(matches)); }catch(e){}
        try{ if(typeof BroadcastChannel !== 'undefined'){ const bc = new BroadcastChannel('del_channel'); bc.postMessage({type:'state_updated'}); bc.close(); } }catch(e){}
        // re-render
        render();
        if(typeof renderTable === 'function') renderTable();
        if(typeof renderFixtures === 'function') renderFixtures();
        if(typeof renderWeekSchedule === 'function') renderWeekSchedule();
        if(typeof renderTop5 === 'function') renderTop5();
        showMessage('Import successful', false);
      } else {
        showMessage('Invalid state file');
      }
    }catch(err){ showMessage('Failed to parse file'); }
  };
  reader.readAsText(f);
  // clear input so same file can be reselected later
  input.value = '';
}
