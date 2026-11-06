(() => {
  "use strict";

  const OWNER = "jumping2000";
  const API = "https://api.github.com";
  const API_HEADERS = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const byId = (id) => document.getElementById(id);
  const number = (value) => Number(value || 0).toLocaleString("it-IT");
  const safeDate = (value, options = { dateStyle: "medium" }) => {
    if (!value) return "data non disponibile";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "data non disponibile";
    return new Intl.DateTimeFormat("it-IT", options).format(parsed);
  };
  const escapeText = (value) => String(value ?? "");

  async function fetchGitHub(path, { search = false } = {}) {
    const response = await fetch(`${API}${path}`, {
      headers: API_HEADERS,
      // Let browser/CDN caching reduce repeat requests and soften unauthenticated limits.
      cache: "default"
    });
    if (!response.ok) {
      const detail = response.headers.get("x-ratelimit-remaining") === "0" ? "rate limit GitHub raggiunto" : `HTTP ${response.status}`;
      throw new Error(`${search ? "GitHub Search" : "GitHub API"}: ${detail}`);
    }
    return response.json();
  }

  // Project filters.
  const filterButtons = [...document.querySelectorAll(".filter-button")];
  const projectCards = [...document.querySelectorAll(".project-card")];
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selected = button.dataset.filter;
      filterButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      projectCards.forEach((card) => {
        card.hidden = selected !== "all" && card.dataset.category !== selected;
      });
    });
  });

  function renderRecentCommits(data) {
    const feed = byId("commit-feed");
    const empty = byId("activity-empty");
    const status = byId("activity-status");
    if (!feed || !empty || !status) return;

    const commits = Array.isArray(data.items) ? data.items : [];
    const unique = [...new Map(commits.filter((item) => item?.sha).map((item) => [item.sha, item])).values()];
    feed.replaceChildren();
    feed.setAttribute("aria-busy", "false");

    if (!unique.length) {
      empty.hidden = false;
      status.textContent = "NESSUN RISULTATO";
      return;
    }

    empty.hidden = true;
    status.textContent = `${unique.length} COMMIT CARICATI`;
    const fragment = document.createDocumentFragment();

    unique.slice(0, 8).forEach((item) => {
      const repo = item.repository || {};
      const commit = item.commit || {};
      const author = commit.author || commit.committer || {};
      const date = author.date || commit.committer?.date;
      const message = String(commit.message || "Commit senza messaggio").split("\n")[0].trim();
      const fullName = repo.full_name || "repository";
      const sha = String(item.sha || "").slice(0, 7);

      const li = document.createElement("li");
      li.className = "commit-item";

      const marker = document.createElement("span");
      marker.className = "commit-marker";
      marker.setAttribute("aria-hidden", "true");

      const body = document.createElement("div");
      body.className = "commit-body";

      const meta = document.createElement("div");
      meta.className = "commit-meta";
      const repoLink = document.createElement("a");
      repoLink.href = repo.html_url || `https://github.com/${fullName}`;
      repoLink.target = "_blank";
      repoLink.rel = "noopener noreferrer";
      repoLink.textContent = fullName;
      const dateLabel = document.createElement("time");
      dateLabel.dateTime = date || "";
      dateLabel.textContent = safeDate(date);
      meta.append(repoLink, dateLabel);

      const title = document.createElement("p");
      title.className = "commit-message";
      title.textContent = message.length > 160 ? `${message.slice(0, 157)}…` : message;

      const footer = document.createElement("div");
      footer.className = "commit-footer";
      const shaLabel = document.createElement("span");
      shaLabel.textContent = sha ? `#${sha}` : "commit";
      const commitLink = document.createElement("a");
      commitLink.href = item.html_url || repo.html_url || `https://github.com/${fullName}`;
      commitLink.target = "_blank";
      commitLink.rel = "noopener noreferrer";
      commitLink.textContent = "Apri commit ↗";
      footer.append(shaLabel, commitLink);

      body.append(meta, title, footer);
      li.append(marker, body);
      fragment.append(li);
    });
    feed.append(fragment);
  }

  function renderRepoUpdates(repositories) {
    const list = byId("repo-updates-list");
    const status = byId("repo-update-status");
    if (!list || !status) return;

    const owned = repositories.filter((repo) => !repo.fork && !repo.archived && repo.pushed_at)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    const recent = owned.slice(0, 5);
    list.replaceChildren();

    if (!recent.length) {
      const li = document.createElement("li");
      li.className = "repo-update-placeholder";
      li.textContent = "Nessun repository aggiornato disponibile.";
      list.append(li);
      status.textContent = "VUOTO";
      return;
    }

    const fragment = document.createDocumentFragment();
    recent.forEach((repo) => {
      const li = document.createElement("li");
      li.className = "repo-update-item";
      const link = document.createElement("a");
      link.href = repo.html_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = repo.name;
      const info = document.createElement("span");
      info.textContent = [repo.language || "linguaggio n/d", `push ${safeDate(repo.pushed_at)}`].join(" · ");
      li.append(link, info);
      fragment.append(li);
    });
    list.append(fragment);
    status.textContent = `${recent.length} REPOSITORY`;
  }

  function renderLanguages(repositories) {
    const container = byId("language-list");
    if (!container) return;
    const counts = new Map();
    repositories.filter((repo) => !repo.fork && !repo.archived && repo.language)
      .forEach((repo) => counts.set(repo.language, (counts.get(repo.language) || 0) + 1));
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    container.replaceChildren();
    if (!entries.length) {
      const span = document.createElement("span");
      span.className = "repo-update-placeholder";
      span.textContent = "Dati linguaggi non disponibili.";
      container.append(span);
      return;
    }
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    entries.forEach(([language, count]) => {
      const row = document.createElement("div");
      row.className = "language-row";
      const label = document.createElement("div");
      label.className = "language-label";
      const name = document.createElement("span");
      name.textContent = language;
      const amount = document.createElement("span");
      amount.textContent = `${count} repo`;
      label.append(name, amount);
      const track = document.createElement("div");
      track.className = "language-track";
      const fill = document.createElement("span");
      fill.style.width = `${Math.max(4, (count / total) * 100)}%`;
      track.append(fill);
      row.append(label, track);
      container.append(row);
    });
  }

  function renderRepoCardMetadata(repositories) {
    const byName = new Map(repositories.map((repo) => [repo.name.toLowerCase(), repo]));
    document.querySelectorAll("[data-repo-stat]").forEach((node) => {
      const repo = byName.get(node.dataset.repoStat.toLowerCase());
      if (repo) node.textContent = number(repo.stargazers_count);
    });
    document.querySelectorAll("[data-repo-freshness]").forEach((node) => {
      const repo = byName.get(node.dataset.repoFreshness.toLowerCase());
      if (!repo) {
        node.textContent = "REPOSITORY NON TROVATO NELL'ELENCO PUBBLICO";
        return;
      }
      node.replaceChildren();
      const language = document.createElement("span");
      language.textContent = repo.language || "Linguaggio n/d";
      const updated = document.createElement("span");
      updated.textContent = `Ultimo push: ${safeDate(repo.pushed_at)}`;
      node.append(language, updated);
    });
  }

  async function loadGitHubData() {
    const statsStatus = byId("stats-status");
    try {
      const [profile, repositories] = await Promise.all([
        fetchGitHub(`/users/${OWNER}`),
        fetchGitHub(`/users/${OWNER}/repos?per_page=100&sort=pushed&type=owner`)
      ]);

      byId("repo-count") && (byId("repo-count").textContent = number(profile.public_repos));
      byId("follower-count") && (byId("follower-count").textContent = number(profile.followers));
      const totalStars = repositories.filter((repo) => !repo.fork).reduce((sum, repo) => sum + Number(repo.stargazers_count || 0), 0);
      byId("star-count") && (byId("star-count").textContent = number(totalStars));
      renderRepoUpdates(repositories);
      renderLanguages(repositories);
      renderRepoCardMetadata(repositories);
      if (statsStatus) statsStatus.textContent = "AGGIORNATI";
    } catch (error) {
      if (statsStatus) {
        statsStatus.textContent = "API NON DISPONIBILE";
        statsStatus.title = error.message;
      }
      const updatesStatus = byId("repo-update-status");
      if (updatesStatus) updatesStatus.textContent = "OFFLINE";
      const updateList = byId("repo-updates-list");
      if (updateList) updateList.textContent = "Metadati GitHub non disponibili.";
      document.querySelectorAll("[data-repo-freshness]").forEach((node) => { node.textContent = "METADATA NON DISPONIBILI"; });
      const languages = byId("language-list");
      if (languages) languages.textContent = "Dati linguaggi non disponibili.";
    }

    try {
      const query = encodeURIComponent(`author:${OWNER}`);
      const commits = await fetchGitHub(`/search/commits?q=${query}&sort=committer-date&order=desc&per_page=8`, { search: true });
      renderRecentCommits(commits);
    } catch (error) {
      const feed = byId("commit-feed");
      const empty = byId("activity-empty");
      const status = byId("activity-status");
      if (feed) {
        feed.replaceChildren();
        feed.setAttribute("aria-busy", "false");
      }
      if (empty) {
        empty.hidden = false;
        empty.title = error.message;
      }
      if (status) status.textContent = "FEED NON DISPONIBILE";
    }
  }

  loadGitHubData();

  const year = byId("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Lightweight Matrix-inspired background. Disabled for reduced-motion users.
  const canvas = byId("matrix-rain");
  if (!canvas || reduceMotion) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const glyphs = "01アイウエオカキクケコサシスセソタチツテトナニヌネノマミムメモヤユヨラリルレロ";
  let columns = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let animationId = 0;
  const fontSize = 14;
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.font = `${fontSize}px "IBM Plex Mono", monospace`;
    columns = Array.from({ length: Math.ceil(width / fontSize) }, () => Math.random() * (height / fontSize));
  };
  const drawFrame = () => {
    context.fillStyle = "rgba(5, 9, 7, 0.075)";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(75, 210, 117, 0.58)";
    context.font = `${fontSize}px "IBM Plex Mono", monospace`;
    columns.forEach((position, index) => {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      context.fillText(glyph, index * fontSize, position * fontSize);
      if (position * fontSize > height && Math.random() > 0.979) columns[index] = 0;
      else columns[index] += 0.42 + Math.random() * 0.24;
    });
  };
  const loop = () => {
    frame += 1;
    if (frame % 2 === 0) drawFrame();
    animationId = window.requestAnimationFrame(loop);
  };
  resize();
  animationId = window.requestAnimationFrame(loop);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) window.cancelAnimationFrame(animationId);
    else animationId = window.requestAnimationFrame(loop);
  });
})();
