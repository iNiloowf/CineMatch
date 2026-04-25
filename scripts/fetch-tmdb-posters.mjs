/**
 * Fetches public TMDB pages and extracts the primary poster file path
 * (same artwork their site uses: og:image w500, or the main poster <img>).
 */
const pages = [
  [603, "movie", "matrix", "The Matrix"],
  [238, "movie", "godfather", "The Godfather"],
  [1396, "tv", "breaking-bad", "Breaking Bad"],
  [27205, "movie", "inception", "Inception"],
  [496243, "movie", "parasite", "Parasite"],
  [680, "movie", "pulp", "Pulp Fiction"],
  [66732, "tv", "stranger", "Stranger Things"],
  [129, "movie", "spirited", "Spirited Away"],
  [438631, "movie", "dune", "Dune"],
  [1399, "tv", "got", "Game of Thrones"],
  [157336, "movie", "interstellar", "Interstellar"],
  [2316, "tv", "office", "The Office (US)"],
];

function extractPath(html) {
  const og = html.match(
    /property="og:image"\s+content="https:\/\/[^"]+\/t\/p\/w500\/([^"]+\.(?:jpg|png|jpeg|webp))"/i,
  );
  if (og?.[1]) {
    return `/${og[1]}`;
  }
  const m = html.match(
    /https:\/\/media\.themoviedb\.org\/t\/p\/w\d+[^"']*\/([a-zA-Z0-9_]+\.jpe?g)/i,
  );
  return m?.[1] ? `/${m[1]}` : null;
}

async function main() {
  const rows = [];
  for (const [id, type, key, label] of pages) {
    const p = type === "movie" ? `/movie/${id}` : `/tv/${id}`;
    const url = `https://www.themoviedb.org${p}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CineMatch/1.0)" },
    });
    const text = await res.text();
    const path = extractPath(text);
    if (!path) {
      console.error("FAIL", id, label, res.status);
      continue;
    }
    const verify = `https://image.tmdb.org/t/p/w500${path}`;
    const head = await fetch(verify, { method: "GET", headers: { Range: "bytes=0-0" } });
    console.log(id, key, head.status, path);
    if (!head.ok) {
      console.error("  verify fail", verify);
    }
    rows.push({ id, type, key, label, path });
  }
  console.log("\n---\n");
  for (const r of rows) {
    console.log(`  { id: "${r.key}", label: "${r.label}", imagePath: \`${r.path}\` },`);
  }
}

main().catch(console.error);
