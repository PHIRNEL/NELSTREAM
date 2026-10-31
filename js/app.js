const API = "/api/tmdb";
const IMG = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/w1280";
const $ = s => document.querySelector(s);
let currentShow = null;

async function tmdb(path, params = {}) {
  const query = new URLSearchParams({path, ...params});
  const response = await fetch(`${API}?${query.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erreur API (${response.status})`);
  return data;
}
function esc(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function imagePath(path) { return path ? IMG + path : ""; }

function renderItems(items, target, type) {
  const el = $(target);
  if (!items || !items.length) { el.innerHTML = '<p class="status">Aucun résultat pour le moment.</p>'; return; }
  el.innerHTML = items.map(item => {
    const title = item.name || item.title || "Sans titre";
    const year = (item.first_air_date || item.release_date || "").slice(0,4);
    const poster = imagePath(item.poster_path);
    return `<article class="item" data-id="${item.id}" data-type="${type}">
      <div class="poster">${poster ? `<img loading="lazy" src="${poster}" alt="Affiche de ${esc(title)}">` : `<div class="poster-placeholder">${esc(title.slice(0,2).toUpperCase())}</div>`}</div>
      <h3>${esc(title)}</h3><small>${esc(year)} · ${type === "tv" ? "Série" : "Film"}</small>
    </article>`;
  }).join("");
}

async function loadHome() {
  $("#showsGrid").innerHTML = '<p class="status">Chargement des séries...</p>';
  $("#moviesGrid").innerHTML = '<p class="status">Chargement des films...</p>';
  try {
    const [shows, movies] = await Promise.all([
      tmdb("tv/popular", {language:"fr-FR",page:"1"}),
      tmdb("movie/popular", {language:"fr-FR",page:"1"})
    ]);
    renderItems(shows.results, "#showsGrid", "tv");
    renderItems(movies.results, "#moviesGrid", "movie");
  } catch (error) {
    $("#showsGrid").innerHTML = `<p class="status">Impossible de charger les séries. ${esc(error.message)}</p>`;
    $("#moviesGrid").innerHTML = `<p class="status">Impossible de charger les films. Vérifiez la configuration TMDB.</p>`;
  }
}

async function searchCatalog(value) {
  const query = value.trim();
  if (!query) { loadHome(); return; }
  $("#showsGrid").innerHTML = '<p class="status">Recherche en cours...</p>';
  $("#moviesGrid").innerHTML = "";
  try {
    const [shows,movies] = await Promise.all([
      tmdb("search/tv",{query,language:"fr-FR",page:"1"}),
      tmdb("search/movie",{query,language:"fr-FR",page:"1"})
    ]);
    renderItems(shows.results,"#showsGrid","tv");
    renderItems(movies.results,"#moviesGrid","movie");
  } catch(error) {
    $("#showsGrid").innerHTML = `<p class="status">${esc(error.message)}</p>`;
  }
}

async function openDetails(id, type) {
  currentShow = {id, type};
  $("#detailsModal").classList.remove("hidden");
  $("#detailTitle").textContent = "Chargement...";
  $("#detailOverview").textContent = "";
  $("#detailMeta").textContent = "";
  $("#seasonSelect").innerHTML = "";
  $("#episodes").innerHTML = "";
  $("#providers").innerHTML = '<p class="status">Recherche des plateformes...</p>';
  $("#trailer").innerHTML = '<p class="status">Recherche de la bande-annonce...</p>';
  try {
    const endpoint = `${type}/${id}`;
    const [details, providers, videos] = await Promise.all([
      tmdb(endpoint,{language:"fr-FR"}),
      tmdb(`${endpoint}/watch/providers`),
      tmdb(`${endpoint}/videos`,{language:"fr-FR"})
    ]);
    const title = details.name || details.title || "Sans titre";
    $("#detailTitle").textContent = title;
    $("#detailOverview").textContent = details.overview || "Aucun résumé disponible en français.";
    $("#detailMeta").textContent = `${type === "tv" ? "SÉRIE" : "FILM"} · ${(details.first_air_date || details.release_date || "").slice(0,4)} · ${(details.genres || []).map(g=>g.name).join(" / ")}`;
    $("#detailHead").style.backgroundImage = details.backdrop_path ? `linear-gradient(0deg,#151821,transparent),url("${BACKDROP+details.backdrop_path}")` : "linear-gradient(120deg,#451b28,#151821)";
    if (type === "tv") {
      const seasons = (details.seasons || []).filter(s => s.season_number >= 0);
      $("#seasonSelect").innerHTML = seasons.length ? seasons.map(s=>`<option value="${s.season_number}">${esc(s.name)} (${s.episode_count} épisodes)</option>`).join("") : '<option value="">Aucune saison disponible</option>';
      $("#seasonSelect").onchange = () => loadSeason(id, $("#seasonSelect").value);
      if (seasons.length) await loadSeason(id, seasons[0].season_number);
    } else {
      $("#seasonSelect").classList.add("hidden");
      $("#episodes").innerHTML = '<div class="episode">Ce contenu est un film, il ne comporte pas de saisons.</div>';
    }
    renderProviders(providers.results?.[$("#region").value], providers.results?.[$("#region").value] ? $("#region").value : "");
    renderTrailer(videos.results || []);
  } catch(error) {
    $("#detailTitle").textContent = "Informations indisponibles";
    $("#detailOverview").textContent = error.message;
  }
}

async function loadSeason(id, seasonNumber) {
  if (seasonNumber === "") return;
  $("#episodes").innerHTML = '<p class="status">Chargement des épisodes...</p>';
  try {
    const data = await tmdb(`tv/${id}/season/${seasonNumber}`,{language:"fr-FR"});
    const eps = data.episodes || [];
    $("#episodes").innerHTML = eps.length ? eps.map(ep=>`
      <div class="episode"><strong>Épisode ${ep.episode_number} : ${esc(ep.name)}</strong>
      <div>${esc(ep.overview || "Résumé non disponible.")}</div></div>`).join("") : '<div class="episode">Aucun épisode référencé.</div>';
  } catch(error) { $("#episodes").innerHTML = `<p class="status">${esc(error.message)}</p>`; }
}

function renderProviders(countryData, region) {
  if (!countryData) {
    $("#providers").innerHTML = `<p class="status">TMDB ne fournit pas actuellement de disponibilité pour la région ${esc($("#region").value)}. Essayez une autre région ou consultez le service officiel.</p>`;
    return;
  }
  const groups = [
    ["Abonnement",countryData.flatrate || []],
    ["Gratuit",countryData.free || []],
    ["Location",countryData.rent || []],
    ["Achat",countryData.buy || []]
  ];
  const entries = groups.flatMap(([label,items])=>items.map(p=>({...p,kind:label})));
  const unique = [...new Map(entries.map(p=>[p.provider_id,p])).values()];
  const link = countryData.link;
  $("#providers").innerHTML = unique.length ? `<div class="provider-list">${unique.map(p=>`
    <div class="provider">${p.logo_path ? `<img src="https://image.tmdb.org/t/p/w92${p.logo_path}" alt="">` : ""}
    <span>${esc(p.provider_name)} · ${esc(p.kind)}</span></div>`).join("")}</div>
    ${link ? `<p><a class="primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Voir les options officielles</a></p>` : ""}`
    : `<p class="status">Aucun fournisseur référencé pour cette région.</p>${link ? `<p><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Consulter les disponibilités sur TMDB</a></p>` : ""}`;
}

function renderTrailer(videos) {
  const trailer = videos.find(v=>v.site === "YouTube" && v.type === "Trailer") ||
                  videos.find(v=>v.site === "YouTube" && v.type === "Teaser");
  $("#trailer").innerHTML = trailer
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}" title="Bande-annonce" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
    : '<p class="status">Aucune bande-annonce YouTube référencée.</p>';
}

document.addEventListener("click", e => {
  const item = e.target.closest(".item");
  if (item) openDetails(item.dataset.id,item.dataset.type);
  if (e.target.matches("[data-close]")) $("#detailsModal").classList.add("hidden");
});
document.addEventListener("keydown", e => { if(e.key==="Escape") $("#detailsModal").classList.add("hidden"); });
$("#reloadShows").addEventListener("click",loadHome);
$("#region").addEventListener("change",()=>{if(currentShow) openDetails(currentShow.id,currentShow.type);});
let searchTimer;
$("#search").addEventListener("input",e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>searchCatalog(e.target.value),350);});
loadHome();
