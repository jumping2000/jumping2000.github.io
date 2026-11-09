// Regenerates the activity and projects sections of README.md from the public GitHub API.
import { readFileSync, writeFileSync } from "node:fs";

const OWNER = process.env.GITHUB_REPOSITORY_OWNER || "jumping2000";
const headers = {
  Accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
};
const api = async (path) => {
  const res = await fetch(`https://api.github.com/${path}`, { headers });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};
const link = (text, url) => `[${text}](${url})`;

const describe = ({ type, repo, payload: p }) => {
  const r = link(repo.name, `https://github.com/${repo.name}`);
  switch (type) {
    case "PullRequestEvent": {
      const pr = link(`#${p.number}`, `https://github.com/${repo.name}/pull/${p.number}`);
      if (p.action === "opened") return `💪 Opened PR ${pr} in ${r}`;
      if (p.action === "merged" || p.pull_request?.merged) return `🎉 Merged PR ${pr} in ${r}`;
      if (p.action === "closed") return `❌ Closed PR ${pr} in ${r}`;
      return;
    }
    case "WatchEvent": return `⭐ Starred ${r}`;
    case "ForkEvent": return `🍴 Forked ${r}`;
    case "CreateEvent": return p.ref_type === "repository" ? `🆕 Created ${r}` : undefined;
    case "PushEvent": return `⬆️ Pushed to ${r}`;
  }
};

const events = await api(`users/${OWNER}/events/public?per_page=100`);
const activity = [...new Set(
  events.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(describe).filter(Boolean),
)].slice(0, 5).map((line, i) => `${i + 1}. ${line}`).join("\n");

// shortcut: only the first 100 repos are read, move to pagination if the account grows past that.
const repos = (await api(`users/${OWNER}/repos?type=owner&per_page=100`))
  .filter((r) => !r.fork && r.name !== OWNER)
  .sort((a, b) =>
    (b.stargazers_count + b.forks_count) - (a.stargazers_count + a.forks_count)
    || b.stargazers_count - a.stargazers_count
    || a.name.localeCompare(b.name))
  .slice(0, 10);
const cell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim() || "—";
const projects = [
  "| # | Project | Description | Language | ⭐ Stars | 🍴 Forks |",
  "|--:|---------|-------------|----------|-------:|-------:|",
  ...repos.map((r, i) =>
    `| ${i + 1} | ${link(r.name, r.html_url)}${r.archived ? " *(archived)*" : ""} | ${cell(r.description)} | ${cell(r.language)} | ${r.stargazers_count} | ${r.forks_count} |`),
].join("\n");

let readme = readFileSync("README.md", "utf8");
for (const [name, body] of [["activity", activity], ["projects", projects]]) {
  const re = new RegExp(String.raw`(<!--START_SECTION:${name}-->\r?\n)[\s\S]*?(<!--END_SECTION:${name}-->)`);
  if (!re.test(readme)) throw new Error(`README.md: missing ${name} markers`);
  readme = readme.replace(re, (_, start, end) => `${start}${body}\n${end}`);
}
writeFileSync("README.md", readme);
