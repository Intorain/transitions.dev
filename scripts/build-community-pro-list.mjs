#!/usr/bin/env node
// Builds assets/community/library-pro.json: the Pro transitions on
// library.html by name only (slug, title, description, category). Their code
// is paid content and never leaves the API. The Studio's library picker shows
// them to free accounts, locked; scripts/build-community-thumbs.mjs captures
// their thumbnails.
//
//   node scripts/build-community-pro-list.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(join(root, "library.html"), "utf8");
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rsquo;/g, "’");

const pro = [];
for (const m of page.matchAll(/<article class="card" data-proto-card[^>]*data-pro="true"[^>]*>/g)) {
  const id = (m[0].match(/data-pro-id="([^"]+)"/) || [])[1];
  if (!id) continue;
  const end = page.indexOf("</article>", m.index);
  const art = page.slice(m.index, end < 0 ? m.index + 8000 : end);
  pro.push({
    slug: id,
    title: decode((art.match(/class="card-title[^"]*">([^<]+)</) || [])[1] || id).trim(),
    desc: decode((art.match(/class="card-subtitle[^"]*">([^<]+)</) || [])[1] || "").trim(),
    cat: (m[0].match(/data-cat="([^"]+)"/) || [])[1] || "essential",
  });
}
writeFileSync(join(root, "assets/community/library-pro.json"), JSON.stringify(pro, null, 0) + "\n");
console.log("wrote", pro.length, "Pro transitions to assets/community/library-pro.json");
