/* A complete, source-linked research snapshot. No accounts, tracking or runtime data writes. */
'use strict';

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clueLabels = {
  natural_substance:'Natural substance', endogenous_molecule:'Endogenous molecule',
  biological_physiological_observation:'Biology & physiology', clinical_veterinary_effect:'Clinical / veterinary effect',
  genetic_population_observation:'Genetic / population clue', synthetic_compound_effect:'Observed synthetic activity',
  theoretical_design:'Theoretical design', other:'Other starting clue', not_reported:'Clue not reported'
};
const basisLabels = {observation_led:'Observed clue',design_from_scratch:'Design from scratch',mixed:'Mixed pathways',unclear:'First step not established'};
const circumstanceLabels = {planned:'Planned',unexpected:'Unexpected',both:'Planned + unexpected',unclear:'Circumstances unclear',not_reported:'Not reported'};
const readLabels = {full_text:'Full text read',relevant_full_text_sections:'Relevant sections read',abstract_only:'Abstract only',metadata_only:'Metadata only',unavailable:'Not read / unavailable'};
const roleLabels = {original_experiment:'Original experiment',discoverer_account:'Discoverer’s account',historical_review:'Historical review',institutional_history:'Institutional history',navigation:'Navigation source'};
const supportLabel = value => value === 'documented' ? 'Documented' : value === 'inferred_from_source_observation' ? 'Inferred from source observations' : 'Not reported';
const basisSupportLabel = value => value === 'not_reported' ? 'Starting point unclear' : supportLabel(value);
const filterIds = ['basis','clue','circumstances','country','status'];
let atlas, classById, filtered = [], visibleCount = 12, layout = 'cards';
let homeScroll = 0, toastTimer, activeClass = null, lastOriginHash = '#explore';
let clinicalById = new Map(), contributionFilter = 'all';
let aliasesByClass = new Map(), aliasesByName = new Map();
const contributionLabels = {documented:'Documented human contribution',not_established:'Human link not established in the available records',unresolved:'Proposed human link unresolved'};

function searchRank(entry, query) {
  if (!query.trim()) return 0;
  const aliases = [...entry.cohortEntries.flatMap(item => [item.name, ...item.components]),...(aliasesByClass.get(entry.id)||[])];
  const raw = normalize(query);
  const stripped = query.toLowerCase().replace(/\b(besylate|besilate|hydrochloride|hydrobromide|sodium|potassium|calcium|maleate|fumarate|succinate|tartrate|mesylate|phosphate)\b/g,'');
  const q = normalize(stripped) || raw;
  const names = [entry.name, entry.id.replaceAll('_',' '), ...entry.medicines, ...aliases].map(normalize);
  if (names.includes(raw) || names.includes(q)) return 100;
  if (names.some(name => name.startsWith(q))) return 80;
  if (names.some(name => name.includes(q))) return 65;
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean).map(normalize);
  const nameText = names.join(' ');
  if (tokens.length > 1 && tokens.every(token => nameText.includes(token))) return 60;
  if (entry.checked) {
    const text = [entry.starting.description,entry.inspiration.description,entry.design.description,...entry.steps.map(step => step.description)].join(' ');
    const terms = q === 'fungus' || q === 'fungi' ? ['fungus','fungi','fungal'] : [q];
    if (terms.some(term => normalize(text).includes(term))) return 30;
  }
  return -1;
}

function currentFilters() {
  return Object.fromEntries([['q',$('search').value],['human',contributionFilter],...filterIds.map(id => [id,$(id).value])]);
}
function syncURL() {
  const url = new URL(location.href), state = currentFilters();
  for (const [key,value] of Object.entries(state)) {
    if (value && value !== 'all') url.searchParams.set(key,value); else url.searchParams.delete(key);
  }
  if (layout !== 'cards') url.searchParams.set('view',layout); else url.searchParams.delete('view');
  history.replaceState(history.state,'',url);
}
function restoreFilters() {
  const params = new URL(location.href).searchParams;
  $('search').value = params.get('q') || '';
  contributionFilter = clinicalById.size && Object.hasOwn(contributionLabels,params.get('human')) ? params.get('human') : 'all';
  for (const id of filterIds) {
    const value = params.get(id) || 'all';
    $(id).value = [...$(id).options].some(option => option.value === value) ? value : 'all';
  }
  setLayout(params.get('view') === 'index' ? 'index' : 'cards',false);
}

function measurePaper() {
  // Only visible page nodes participate in the kit's reading-order calculation.
  document.querySelectorAll('.node, [data-paper-node]').forEach(node => {
    node.dataset.paperNode = '';
    node.classList.toggle('node', !node.closest('[hidden]'));
  });
  window.Paper?.measure();
}
function renderContributionTally(data) {
  const counts = Object.fromEntries(Object.keys(contributionLabels).map(key=>[key,data.classes.filter(row=>row.group===key).length]));
  if (data.classes.length!==atlas.classes.length || new Set(data.classes.map(row=>row.id)).size!==atlas.classes.length || data.classes.some(row=>!classById.has(row.id))) throw new Error('Contribution membership does not match the atlas.');
  if (Object.values(counts).reduce((sum,count)=>sum+count,0)!==data.classes.length) throw new Error('Contribution group not recognized.');
  clinicalById = new Map(data.classes.map(row=>[row.id,row]));
  const total = data.classes.length, percent = counts.documented / total * 100;
  const markClasses = {documented:'is-filled',not_established:'is-open',unresolved:'is-half'};
  $('contribution-tally').innerHTML = Object.keys(contributionLabels).flatMap(group => data.classes.filter(row=>row.group===group).map(row => {
    const label = `${classById.get(row.id).name}: ${contributionLabels[group]}`;
    return `<a class="${markClasses[group]}" data-group="${group}" href="#class/${encodeURIComponent(row.id)}" data-class="${escapeHTML(row.id)}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}"></a>`;
  })).join('');
  $('contribution-tally').setAttribute('aria-label',`Clinical or population contributions appear in ${counts.documented} of ${total} class histories (${Math.round(percent)}%)`);
  $('tally-share').textContent = `${counts.documented} of ${total}`;
  $('tally-percent').textContent = `${Math.round(percent)}%`;
  $('tally-denominator').textContent = `of ${total} class histories`;
  $('hero-share').textContent = `${counts.documented} of ${total}`;
  $('explore-contributions').textContent = `Explore the ${counts.documented} histories`;
  for (const group of Object.keys(counts)) {
    document.querySelector(`[data-count="${group}"]`).textContent = counts[group];
    document.querySelector(`[data-percent="${group}"]`).textContent = `${(counts[group]/total*100).toFixed(1)}%`;
  }
  measurePaper();
}
function updateContributionFilter() {
  const selected=contributionFilter!=='all';
  $('contribution-filter').hidden=!selected;
  $('contribution-filter-label').textContent=selected?contributionLabels[contributionFilter]:'';
  document.querySelectorAll('.legend-row').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.contribution===contributionFilter)));
}
function selectContribution(value) {
  if (!clinicalById.size) {showToast('The contribution view is still loading. Please try again.');return;}
  contributionFilter=value;
  $('search').value='';
  filterIds.forEach(id=>{$(id).value='all';});
  applyFilters();
  location.hash='explore';
  $('explore').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}

function primaryClue(entry) {
  if (!entry.checked) return 'History not yet checked';
  const short = {natural_substance:'Natural substance',endogenous_molecule:'Endogenous signal',biological_physiological_observation:'Physiology',clinical_veterinary_effect:'Clinical effect',genetic_population_observation:'Genetic clue',synthetic_compound_effect:'Synthetic activity',theoretical_design:'Design rationale',other:'Other clue',not_reported:'Not reported'};
  const clue=$('clue').value;
  const inspirations=[...entry.inspirations].sort((a,b)=>Number(b===clue)-Number(a===clue));
  const labels=inspirations.map(key=>short[key]||clueLabels[key]);
  return labels.slice(0,2).join(' + ')+(labels.length>2 ? ` +${labels.length-2}` : '');
}
function cardMarkup(entry) {
  const names = entry.medicines.length ? entry.medicines.join(' · ') : entry.cohortEntries.map(item=>item.name).join(' · ');
  const checked = entry.checked;
  const starting = checked ? entry.starting.description : 'In the cohort. Its founding history is still being traced and checked.';
  return `<button class="class-card snap ${checked ? '' : 'pending'}" data-class="${entry.id}" aria-label="Read ${escapeHTML(entry.name)}${checked ? '' : ', history not yet checked'}" aria-describedby="starting-${entry.id}">
    <div class="card-top"><span class="card-kind" title="${escapeHTML(entry.checked?entry.inspirations.map(key=>clueLabels[key]).join(' · '):'History not yet checked')}">${escapeHTML(primaryClue(entry))}</span><span class="card-arrow" aria-hidden="true">↗</span></div>
    <div class="catalogue-heading"><h3>${escapeHTML(entry.name)}</h3><p class="medicine-names">${escapeHTML(names)}</p></div>
    <div class="catalogue-description"><p id="starting-${entry.id}" class="card-summary catalogue-starting" title="${escapeHTML(starting)}">${escapeHTML(starting)}</p>
    ${entry.scopeNote ? `<p class="card-summary">${escapeHTML(entry.scopeNote)}</p>` : ''}</div>
    <div class="card-bottom"><span class="circumstance-label"><span class="print-label">Path</span>${checked ? escapeHTML(basisLabels[entry.basis]) + ' · ' + escapeHTML(circumstanceLabels[entry.circumstances.value] || 'Not reported') : 'Cohort entry'}${checked && entry.basisSupport !== 'documented' ? `<span class="inference-label">${escapeHTML(basisSupportLabel(entry.basisSupport))}</span>` : ''}${entry.scopeNote ? '<span class="inference-label">Lineage-specific finding</span>' : ''}</span><span class="source-label">${checked ? entry.sources.length+' <span class="print-label">source records</span><span class="stamp">Author checked</span>' : 'History not yet checked'}</span></div>
  </button>`;
}
function applyFilters(resetCount = true, updateURL = true) {
  if (!atlas) return;
  if (resetCount) visibleCount = 12;
  const state = currentFilters();
  filtered = atlas.classes.map(entry=>({entry,rank:searchRank(entry,state.q)})).filter(({entry,rank})=>{
    if (rank < 0) return false;
    if (state.human !== 'all' && clinicalById.get(entry.id)?.group !== state.human) return false;
    if (state.status !== 'all' && entry.basisSupport !== state.status) return false;
    if (state.country !== 'all' && !entry.countries.includes(state.country)) return false;
    if (state.basis !== 'all' && (!entry.checked || entry.basis !== state.basis)) return false;
    if (state.clue !== 'all' && (!entry.checked || !entry.inspirations.includes(state.clue))) return false;
    if (state.circumstances !== 'all' && (!entry.checked || (state.circumstances === 'unclear' ? !['unclear','not_reported'].includes(entry.circumstances.value) : entry.circumstances.value !== state.circumstances))) return false;
    return true;
  }).sort((a,b)=>b.rank-a.rank || Number(b.entry.checked)-Number(a.entry.checked) || a.entry.name.localeCompare(b.entry.name)).map(item=>item.entry);
  const sourceCount = filtered.reduce((sum,entry)=>sum+entry.sources.length,0);
  const aliasMatch=aliasesByName.get(normalize(state.q));
  $('result-count').innerHTML = `<strong>${filtered.length} ${filtered.length === 1 ? 'class' : 'classes'}</strong>${state.q ? ' matching “'+escapeHTML(state.q)+'”' : ' in view'}${aliasMatch?`<span>${escapeHTML(aliasMatch.name)} → ${escapeHTML(aliasMatch.genericNames.join(' · '))}</span>`:''} <span>· ${sourceCount} linked source records</span>`;
  $('excluded-note').hidden = true;
  updateContributionFilter();
  renderResults();
  if (updateURL) syncURL();
}
function renderResults() {
  const visible = filtered.slice(0,visibleCount);
  $('results').innerHTML = visible.length ? visible.map(cardMarkup).join('') : `<div class="empty-state"><h3>No classes in this view.</h3><p>Try a generic medicine name or broaden the filters. This atlas covers 115 classes in a selected cohort of 226 medication groups. The complete medicine inventory appears below.</p><button data-reset>Clear the search and filters ↗</button></div>`;
  $('show-more').hidden = filtered.length <= visibleCount;
  $('shown-count').textContent = filtered.length ? `${visible.length} of ${filtered.length} classes shown` : '';
  measurePaper();
}
function setLayout(value, updateURL = true) {
  layout = value;
  $('results').classList.toggle('index-view',value==='index');
  $('view-cards').classList.toggle('active',value==='cards');
  $('view-cards').setAttribute('aria-pressed',String(value==='cards'));
  $('view-index').classList.toggle('active',value==='index');
  $('view-index').setAttribute('aria-pressed',String(value==='index'));
  if (atlas && updateURL) syncURL();
  measurePaper();
}
function resetFilters() {
  contributionFilter = 'all';
  $('filters').reset();
  $('search').value = '';
  applyFilters();
}

function orderedSources(entry) {
  const originals = new Set(entry.originalAccounts.map(item=>item.source_id));
  return [...entry.sources].sort((a,b)=>Number(originals.has(b.source_id))-Number(originals.has(a.source_id)));
}
function citations(entry, ids = []) {
  const groups = new Map();
  for (const id of ids) {
    const evidence = entry.evidence.find(item=>item.evidence_id===id);
    if (!evidence) continue;
    if (!groups.has(evidence.source_id)) groups.set(evidence.source_id,[]);
    groups.get(evidence.source_id).push(id);
  }
  if (!groups.size) return '';
  const sources = orderedSources(entry);
  return [...groups].map(([sid,eids])=>{
    const number = sources.findIndex(source=>source.source_id===sid)+1;
    return `<sup class="source-ref"><a href="#class/${encodeURIComponent(entry.id)}/source/${encodeURIComponent(sid)}?evidence=${eids.join(',')}" data-source="${sid}" data-evidence="${eids.join(',')}" aria-label="See source ${number} and evidence locators" title="${escapeHTML(eids.join(', '))}">${number}</a></sup>`;
  }).join('');
}
function statement(entry, item, className = '') {
  return `<p class="statement-text ${className}">${escapeHTML(item.description)}${citations(entry,item.evidence_ids)}</p><p class="support-label">Support · ${escapeHTML(supportLabel(item.support))}</p>`;
}
function sourceMarkup(entry, source) {
  const original = entry.originalAccounts.find(item=>item.source_id===source.source_id);
  const evidence = entry.evidence.filter(item=>item.source_id===source.source_id);
  const readingLimited = !['full_text','relevant_full_text_sections'].includes(source.read_extent);
  return `<li id="source-${source.source_id}" class="source-item" tabindex="-1"><div>
    <div class="source-heading"><span class="source-id">${escapeHTML(source.source_id)}</span><span class="read-badge ${readingLimited?'limited':''}">${escapeHTML(readLabels[source.read_extent]||source.read_extent)}</span></div>
    <a class="source-citation" href="${escapeHTML(source.url)}" target="_blank" rel="noopener">${escapeHTML(source.citation)} <span aria-hidden="true">↗</span></a>
    <p class="source-meta">${escapeHTML(roleLabels[source.role]||source.role)}${original ? ' · '+(original.account_kind==='original_report'?'Original report':'Discoverer’s retrospective') : ''}</p>
    ${evidence.length ? `<details class="source-locators" open><summary>Evidence locators (${evidence.length}) +</summary><ul>${evidence.map(item=>`<li data-eid="${item.evidence_id}"><strong>${escapeHTML(item.evidence_id)}</strong> · ${escapeHTML(item.locator)}</li>`).join('')}</ul></details>` : ''}
  </div></li>`;
}
function cohortTable(entry) {
  return `<table class="cohort-entry-table"><thead><tr><th>MEDICATION GROUP</th><th>US RANK · 2024</th><th>ENGLAND RANK · 2025/26</th></tr></thead><tbody>${entry.cohortEntries.map(med=>`<tr><td>${escapeHTML(med.name)}</td><td>${med.usRank||'Outside selected 150'}</td><td>${med.englandRank||'Outside selected 150'}</td></tr>`).join('')}</tbody></table>`;
}
function renderCohortInventory() {
  const rows = [...atlas.cohort].sort((a,b)=>a.name.localeCompare(b.name));
  $('cohort-inventory').innerHTML = `<p>All ${rows.length} medication groups in the combined cohort. Select a class to read its history. All 226 groups link to class histories. Supportive electrolyte components remain within the macrogol formulation. Prescription versions are included; OTC overlap assessments are retained in the JSON download.</p><table class="cohort-entry-table"><thead><tr><th>MEDICATION GROUP / CLASS</th><th>US RANK · 2024</th><th>ENGLAND RANK · 2025/26</th></tr></thead><tbody>${rows.map(med=>`<tr><td><strong>${escapeHTML(med.name)}</strong><br>${med.classIds.length ? med.classIds.map(id=>`<button class="text-link" data-class="${escapeHTML(id)}">${escapeHTML(classById.get(id).name)} ↗</button>`).join('<br>') : 'Support product · no class history'}</td><td>${med.usRank||'Outside selected 150'}</td><td>${med.englandRank||'Outside selected 150'}</td></tr>`).join('')}</tbody></table>`;
}
function uncertaintyMarkup(entry) {
  const groups = [['Scope & branches',entry.limits],['Where sources differ',entry.conflicts],['Links still missing',entry.gaps]];
  const total = groups.reduce((sum,[,values])=>sum+values.length,0);
  return `<details class="uncertainty"><summary>What remains uncertain <span>${total} notes +</span></summary><div>${groups.map(([name,values])=>values.length ? `<h4>${name}</h4><ul>${values.map(text=>`<li>${escapeHTML(text)}</li>`).join('')}</ul>` : '').join('')}</div></details>`;
}
function clinicalContributionMarkup(entry) {
  const record=clinicalById.get(entry.id);
  if (!record) return '';
  return `<details class="clinical-note"><summary>${escapeHTML(contributionLabels[record.group])}<span aria-hidden="true">+</span></summary><p>${escapeHTML(record.summary)}</p><p class="clinical-scope">${escapeHTML(record.scope)}</p><p class="clinical-scope">Human-observation interpretation · 8 November 2026. Independent historical review of this additional classification is pending.</p>${record.references.length?`<ul>${record.references.map(ref=>`<li><a href="${escapeHTML(ref.url)}" target="_blank" rel="noopener">${escapeHTML(ref.citation)} ↗</a><span>${escapeHTML(ref.locator)} · ${escapeHTML(readLabels[ref.readExtent]||ref.readExtent)}</span></li>`).join('')}</ul>`:''}</details>`;
}
function historyRow(stage, content, className = '') {
  return `<section class="row node history-row reveal ${className}" aria-label="${escapeHTML(stage)}"><div class="margin">${escapeHTML(stage)}</div><div class="span-2">${content}</div></section>`;
}
function buildHistory(entry) {
  const names = entry.medicines.join(' · ');
  const introduction = historyRow('Class history', `<header class="history-intro"><p class="history-eyebrow"><span class="checked-tag">${entry.checked?'Author checked · complete collection':'History not yet checked'}</span><span>${entry.countries.join(' + ')} cohort</span></p><h1 id="history-title" tabindex="-1">${escapeHTML(entry.name)}</h1><p class="medicine-names"><strong>In this cohort:</strong> ${escapeHTML(names)}</p>${entry.checked ? `<div class="history-tags"><span>${escapeHTML(basisLabels[entry.basis])}</span><span>${escapeHTML(basisSupportLabel(entry.basisSupport))}</span><span>${escapeHTML(circumstanceLabels[entry.circumstances.value]||'Not reported')}</span></div><p class="history-clues">${escapeHTML(entry.inspirations.map(key=>clueLabels[key]).join(' · '))}</p>` : ''}</header>`);
  if (!entry.checked) return introduction
    + historyRow('Starting point', `<p class="section-label">IN THE ATLAS · STILL BEING TRACED</p><h3>A history still to reconstruct.</h3><p>This class belongs to the selected cohort. Its founding history has not been source checked for this snapshot. A classification will appear after its evidence has been examined.</p>`)
    + historyRow('Cohort', `<h3>The cohort entries</h3>${cohortTable(entry)}<p class="history-footnote">This page makes no historical-origin claim. Snapshot ${formatDate(atlas.meta.snapshotDate)}.</p>`);
  const sources = orderedSources(entry);
  return introduction
    + historyRow('Human link', clinicalContributionMarkup(entry))
    + historyRow('Starting point', `<p class="section-label">01 / WHAT OPENED THE PATH?</p>${statement(entry,entry.starting)}<p class="origin-support">${escapeHTML(basisLabels[entry.basis])} · ${escapeHTML(basisSupportLabel(entry.basisSupport))}</p>${entry.scopeNote ? `<aside class="basis-note"><p class="section-label">SCOPE OF THIS FINDING</p><p>${escapeHTML(entry.scopeNote)}</p></aside>` : ''}<button class="link-ink scope-jump" data-uncertainty>Class-level account · read the scope and open questions ↘</button>`)
    + historyRow('Steps', '<p class="section-label">02 / HOW IT UNFOLDED</p><h3>From clue to medicine.</h3>')
    + entry.steps.map((step,index)=>historyRow(`Step ${step.step || index+1}`, statement(entry,step), 'tight')).join('')
    + historyRow('Design', `<p class="section-label">03 / WHAT WAS DESIGNED?</p><h3>The human contribution.</h3>${statement(entry,entry.design)}`)
    + historyRow('Circumstances', `<p class="section-label">PLANNED OR UNEXPECTED?</p>${statement(entry,entry.circumstances)}<div class="basis-note"><p class="section-label">KEEP THE QUESTIONS SEPARATE</p><p>An observation-led path can involve deliberate experiments and substantial molecular design. A synthetic medicine can have an observed biological starting point.</p></div>`)
    + historyRow('Sources', `<p class="section-label">04 / READ THE ACCOUNTS</p><h3>Go back to the evidence.</h3><p class="source-explainer">${entry.sources.length} source records · ${entry.originalAccounts.length} original-account links. Original experiments and discoverer accounts appear first. Reading labels state how much of each source was accessed for collection; they do not imply every passage was independently verified.</p><ol class="sources">${sources.map(source=>sourceMarkup(entry,source)).join('')}</ol>`)
    + historyRow('Limits', uncertaintyMarkup(entry))
    + historyRow('Cohort', `<details class="uncertainty"><summary>The medicines in this cohort <span>+</span></summary><div>${cohortTable(entry)}<p class="history-footnote">Class-level ancestry does not mean every member has the same structure or individual development history. Combination entries can appear under more than one class.</p></div></details><p class="history-footnote">Snapshot ${formatDate(atlas.meta.snapshotDate)}. ${escapeHTML(atlas.meta.reviewBoundary)} The retained limitations bound the class-level finding.</p>`)
    + historyRow('Catalogue', `<div class="history-navigation">${neighborLinks(entry)}<button class="link-ink" data-back>Back to the discovery index ←</button></div>`);
}
function neighborLinks(entry) {
  const index = filtered.findIndex(item=>item.id===entry.id);
  if(index<0) return '';
  return `<div>${index>0?`<button data-class="${filtered[index-1].id}">← ${escapeHTML(filtered[index-1].name)}</button>`:''}${index<filtered.length-1?`<button data-class="${filtered[index+1].id}">${escapeHTML(filtered[index+1].name)} →</button>`:''}</div>`;
}
function openHistory(cid) {
  if (!classById.has(cid)) return;
  if (!activeClass) {homeScroll=window.scrollY;lastOriginHash=location.hash.startsWith('#class/')?'#explore':location.hash||'#explore';}
  location.hash='class/'+encodeURIComponent(cid);
}
function closeHistory() {
  location.hash=lastOriginHash;
}
function route() {
  const match = location.hash.match(/^#class\/([^/?]+)/);
  if (match) {
    let cid;try {cid=decodeURIComponent(match[1]);}catch {return;}
    const entry = classById.get(cid);
    if (!entry) {showToast('That class is not in this atlas.');return;}
    activeClass=cid;
    $('atlas-home').hidden=true;
    document.querySelector('.paper-foot').hidden=true;
    $('history-page').hidden=false;
    $('history-content').innerHTML=buildHistory(entry);
    document.body.classList.add('reading');
    document.title=`${entry.name} — Medicine Origins Atlas`;
    measurePaper();
    window.scrollTo({top:0,behavior:'instant'});
    $('history-title').focus({preventScroll:true});
    const sourceMatch = location.hash.match(/\/source\/([^/?]+)(?:\?evidence=([^#]+))?$/);
    if (sourceMatch) focusSource(sourceMatch[1],sourceMatch[2] || '');
  } else {
    const wasReading=!!activeClass;
    activeClass=null;
    $('atlas-home').hidden=false;
    document.querySelector('.paper-foot').hidden=false;
    $('history-page').hidden=true;
    document.body.classList.remove('reading');
    document.title='Where Medicines Begin — The Medicine Origins Atlas';
    measurePaper();
    if (wasReading) requestAnimationFrame(()=>{
      if(location.hash===lastOriginHash&&homeScroll>0)window.scrollTo({top:homeScroll,behavior:'instant'});
      else {const section=document.getElementById(location.hash.slice(1)||'atlas-home');section?.scrollIntoView({behavior:'instant'});}
    });
  }
}
function focusSource(sourceId,evidenceIds) {
  const section = document.getElementById('source-'+sourceId);
  if (!section) return;
  const details=section.querySelector('details');if(details)details.open=true;
  document.querySelectorAll('.source-highlight,.locator-highlight').forEach(element=>element.classList.remove('source-highlight','locator-highlight'));
  section.classList.add('source-highlight');
  for(const id of evidenceIds.split(','))section.querySelector(`[data-eid="${id}"]`)?.classList.add('locator-highlight');
  measurePaper();
  section.focus({preventScroll:true});
  section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
}
function showToast(message) {
  clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');
  toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);
}
function formatDate(value) {return new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}

document.addEventListener('click',event=>{
  const contributionButton=event.target.closest('[data-contribution]');if(contributionButton){event.preventDefault();selectContribution(contributionButton.dataset.contribution);return;}
  if(event.target.closest('[data-clear-contribution]')){contributionFilter='all';applyFilters();return;}
  if(event.target.closest('[data-method]'))$('clinical-method').open=true;
  const classButton=event.target.closest('[data-class]');if(classButton){if(classButton.tagName==='A'&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey))return;event.preventDefault();openHistory(classButton.dataset.class);return;}
  const sourceButton=event.target.closest('[data-source]');if(sourceButton){if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();focusSource(sourceButton.dataset.source,sourceButton.dataset.evidence);return;}
  if(event.target.closest('[data-reset]'))resetFilters();
  if(event.target.closest('[data-back]'))closeHistory();
  if(event.target.closest('[data-uncertainty]')){const note=document.querySelector('.uncertainty');if(note){note.open=true;measurePaper();note.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}}
});
document.addEventListener('toggle',measurePaper,true);
$('close-history').addEventListener('click',closeHistory);
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);showToast('History link copied.');}catch{showToast('Copy the address from your browser to share this history.');}});
$('search').addEventListener('input',()=>applyFilters());
$('search').addEventListener('keydown',event=>{if(event.key==='Enter'&&filtered.length){event.preventDefault();openHistory(filtered[0].id);}if(event.key==='ArrowDown'){event.preventDefault();$('results').querySelector('button')?.focus();}});
$('results').addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp'].includes(event.key))return;const buttons=[...$('results').querySelectorAll('.class-card')],index=buttons.indexOf(event.target);if(index<0)return;event.preventDefault();const target=buttons[index+(event.key==='ArrowDown'?1:-1)];if(target)target.focus();else if(event.key==='ArrowUp')$('search').focus();});
filterIds.forEach(id=>$(id).addEventListener('change',()=>applyFilters()));
$('filters').addEventListener('submit',event=>event.preventDefault());
$('filters').addEventListener('reset',()=>requestAnimationFrame(()=>{contributionFilter='all';$('search').value='';applyFilters();}));
$('view-cards').addEventListener('click',()=>setLayout('cards'));
$('view-index').addEventListener('click',()=>setLayout('index'));
$('show-more').addEventListener('click',()=>{visibleCount+=12;renderResults();});
document.addEventListener('keydown',event=>{
  if(event.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)&&!activeClass){event.preventDefault();$('search').focus();$('explore').scrollIntoView({behavior:'smooth'});}
  if(event.key==='Escape'&&activeClass)closeHistory();
});
window.addEventListener('hashchange',()=>{if(atlas)route();});
window.addEventListener('popstate',()=>{if(atlas){restoreFilters();applyFilters(false,false);}});

async function start() {
  try {
    const response=await fetch('/medication-origin/atlas.json');if(!response.ok)throw new Error('Snapshot could not be loaded.');
    atlas=await response.json();classById=new Map(atlas.classes.map(entry=>[entry.id,entry]));
    $('class-stat').textContent=atlas.classes.length;
    $('group-stat').textContent=atlas.cohort.length;
    $('checked-stat').textContent=atlas.meta.sourceRecords;
    $('snapshot-caption').textContent=`${formatDate(atlas.meta.snapshotDate)} · All ${atlas.meta.checkedClasses} histories collected. ${atlas.meta.supportCounts.documented} documented · ${atlas.meta.supportCounts.inferred_from_source_observation} inferred · ${atlas.meta.supportCounts.not_reported} unclear.`;
    $('footer-snapshot').textContent=`Snapshot ${formatDate(atlas.meta.snapshotDate)} · ${atlas.meta.checkedClasses} histories · ${atlas.meta.sourceRecords} linked source records.`;
    $('cohort-sources').innerHTML=atlas.meta.cohortSources.map(source=>`<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener">${escapeHTML(source.title)} ↗</a>`).join('');
    try {
      const clinicalResponse=await fetch('/medication-origin/clinical-contributions.json');
      if(!clinicalResponse.ok)throw new Error('Contribution data unavailable.');
      renderContributionTally(await clinicalResponse.json());
    }catch(error){
      document.querySelector('.contribution-figure').insertAdjacentHTML('beforeend','<p role="status" class="tally-footnote">The contribution graphic could not be loaded. Reload to explore its categories.</p>');
      document.querySelectorAll('[data-contribution]').forEach(button=>{button.disabled=true;});
    }
    try {
      const aliasResponse=await fetch('/medication-origin/synonyms.json');
      if(!aliasResponse.ok)throw new Error('Brand dictionary unavailable.');
      const dictionary=await aliasResponse.json();
      for(const alias of dictionary.aliases){
        aliasesByName.set(normalize(alias.name),alias);
        for(const cid of alias.classIds){
          if(!classById.has(cid))continue;
          if(!aliasesByClass.has(cid))aliasesByClass.set(cid,[]);
          aliasesByClass.get(cid).push(alias.name);
        }
      }
    }catch(error){document.querySelector('.search-hint').textContent='Brand names are unavailable. Search by generic name.';}
    restoreFilters();applyFilters(true,false);route();
  }catch(error){$('result-count').textContent='The research snapshot could not be loaded.';$('snapshot-caption').textContent='Please reload the page or download the snapshot below.';}
}
start();
