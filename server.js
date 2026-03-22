const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ── Site definitions ──────────────────────────────────────────────────────────
// Each entry: { name, url (with {u} placeholder), errorType, errorMsg? }
// errorType: "status_code" → 404 = not found | "response_url" → redirected away
// errorMsg:  substring in body that means NOT FOUND (used with status_code for some)
const SITES = [
  // Social
  { name: "Twitter / X",         url: "https://twitter.com/{u}",                    cat: "Social",    errorType: "status_code" },
  { name: "Instagram",           url: "https://www.instagram.com/{u}/",             cat: "Social",    errorType: "status_code" },
  { name: "TikTok",              url: "https://www.tiktok.com/@{u}",                cat: "Social",    errorType: "status_code" },
  { name: "Facebook",            url: "https://www.facebook.com/{u}",               cat: "Social",    errorType: "status_code" },
  { name: "Pinterest",           url: "https://www.pinterest.com/{u}/",             cat: "Social",    errorType: "status_code" },
  { name: "Snapchat",            url: "https://www.snapchat.com/add/{u}",           cat: "Social",    errorType: "status_code" },
  { name: "LinkedIn",            url: "https://www.linkedin.com/in/{u}",            cat: "Social",    errorType: "status_code" },
  { name: "Tumblr",              url: "https://{u}.tumblr.com/",                    cat: "Social",    errorType: "status_code" },
  { name: "Mastodon",            url: "https://mastodon.social/@{u}",               cat: "Social",    errorType: "status_code" },
  { name: "Threads",             url: "https://www.threads.net/@{u}",               cat: "Social",    errorType: "status_code" },
  { name: "Bluesky",             url: "https://bsky.app/profile/{u}",               cat: "Social",    errorType: "status_code" },
  { name: "VK",                  url: "https://vk.com/{u}",                         cat: "Social",    errorType: "status_code" },
  { name: "OK.ru",               url: "https://ok.ru/{u}",                          cat: "Social",    errorType: "status_code" },
  { name: "MeWe",                url: "https://mewe.com/i/{u}",                     cat: "Social",    errorType: "status_code" },
  { name: "Minds",               url: "https://www.minds.com/{u}/",                 cat: "Social",    errorType: "status_code" },
  { name: "Parler",              url: "https://parler.com/{u}",                     cat: "Social",    errorType: "status_code" },
  { name: "Gab",                 url: "https://gab.com/{u}",                        cat: "Social",    errorType: "status_code" },
  { name: "Diaspora",            url: "https://diaspora.social/u/{u}",              cat: "Social",    errorType: "status_code" },
  // Dev / Tech
  { name: "GitHub",              url: "https://github.com/{u}",                     cat: "Dev",       errorType: "status_code" },
  { name: "GitLab",              url: "https://gitlab.com/{u}",                     cat: "Dev",       errorType: "status_code" },
  { name: "Bitbucket",           url: "https://bitbucket.org/{u}/",                 cat: "Dev",       errorType: "status_code" },
  { name: "Stack Overflow",      url: "https://stackoverflow.com/users/{u}",        cat: "Dev",       errorType: "status_code" },
  { name: "Dev.to",              url: "https://dev.to/{u}",                          cat: "Dev",       errorType: "status_code" },
  { name: "Hashnode",            url: "https://hashnode.com/@{u}",                  cat: "Dev",       errorType: "status_code" },
  { name: "Replit",              url: "https://replit.com/@{u}",                    cat: "Dev",       errorType: "status_code" },
  { name: "CodePen",             url: "https://codepen.io/{u}",                     cat: "Dev",       errorType: "status_code" },
  { name: "JSFiddle",            url: "https://jsfiddle.net/user/{u}/",             cat: "Dev",       errorType: "status_code" },
  { name: "Glitch",              url: "https://glitch.com/@{u}",                    cat: "Dev",       errorType: "status_code" },
  { name: "HackerNews",          url: "https://news.ycombinator.com/user?id={u}",   cat: "Dev",       errorType: "status_code" },
  { name: "npm",                 url: "https://www.npmjs.com/~{u}",                 cat: "Dev",       errorType: "status_code" },
  { name: "PyPI",                url: "https://pypi.org/user/{u}/",                 cat: "Dev",       errorType: "status_code" },
  { name: "DockerHub",           url: "https://hub.docker.com/u/{u}",               cat: "Dev",       errorType: "status_code" },
  { name: "Hugging Face",        url: "https://huggingface.co/{u}",                 cat: "Dev",       errorType: "status_code" },
  { name: "Kaggle",              url: "https://www.kaggle.com/{u}",                 cat: "Dev",       errorType: "status_code" },
  { name: "LeetCode",            url: "https://leetcode.com/{u}/",                  cat: "Dev",       errorType: "status_code" },
  { name: "Codeforces",          url: "https://codeforces.com/profile/{u}",         cat: "Dev",       errorType: "status_code" },
  { name: "HackerEarth",         url: "https://www.hackerearth.com/@{u}",           cat: "Dev",       errorType: "status_code" },
  { name: "Exercism",            url: "https://exercism.org/profiles/{u}",           cat: "Dev",       errorType: "status_code" },
  // Gaming
  { name: "Twitch",              url: "https://www.twitch.tv/{u}",                  cat: "Gaming",    errorType: "status_code" },
  { name: "Steam",               url: "https://steamcommunity.com/id/{u}",          cat: "Gaming",    errorType: "status_code" },
  { name: "Xbox",                url: "https://account.xbox.com/en-us/profile?gamertag={u}", cat: "Gaming", errorType: "status_code" },
  { name: "PlayStation",         url: "https://psnprofiles.com/{u}",                cat: "Gaming",    errorType: "status_code" },
  { name: "Roblox",              url: "https://www.roblox.com/user.aspx?username={u}", cat: "Gaming", errorType: "status_code" },
  { name: "Minecraft",           url: "https://namemc.com/profile/{u}",             cat: "Gaming",    errorType: "status_code" },
  { name: "Chess.com",           url: "https://www.chess.com/member/{u}",           cat: "Gaming",    errorType: "status_code" },
  { name: "Lichess",             url: "https://lichess.org/@/{u}",                  cat: "Gaming",    errorType: "status_code" },
  { name: "Speedrun.com",        url: "https://www.speedrun.com/user/{u}",          cat: "Gaming",    errorType: "status_code" },
  { name: "Itch.io",             url: "https://{u}.itch.io/",                       cat: "Gaming",    errorType: "status_code" },
  { name: "Kongregate",          url: "https://www.kongregate.com/accounts/{u}",    cat: "Gaming",    errorType: "status_code" },
  { name: "Newgrounds",          url: "https://www.newgrounds.com/art/view/{u}",    cat: "Gaming",    errorType: "status_code" },
  // Video / Media
  { name: "YouTube",             url: "https://www.youtube.com/@{u}",               cat: "Video",     errorType: "status_code" },
  { name: "Vimeo",               url: "https://vimeo.com/{u}",                      cat: "Video",     errorType: "status_code" },
  { name: "Dailymotion",         url: "https://www.dailymotion.com/{u}",            cat: "Video",     errorType: "status_code" },
  { name: "Rumble",              url: "https://rumble.com/user/{u}",                cat: "Video",     errorType: "status_code" },
  { name: "Kick",                url: "https://kick.com/{u}",                       cat: "Video",     errorType: "status_code" },
  { name: "Trovo",               url: "https://trovo.live/{u}",                     cat: "Video",     errorType: "status_code" },
  // Music
  { name: "SoundCloud",          url: "https://soundcloud.com/{u}",                 cat: "Music",     errorType: "status_code" },
  { name: "Spotify",             url: "https://open.spotify.com/user/{u}",          cat: "Music",     errorType: "status_code" },
  { name: "Last.fm",             url: "https://www.last.fm/user/{u}",               cat: "Music",     errorType: "status_code" },
  { name: "Bandcamp",            url: "https://{u}.bandcamp.com/",                  cat: "Music",     errorType: "status_code" },
  { name: "Mixcloud",            url: "https://www.mixcloud.com/{u}/",              cat: "Music",     errorType: "status_code" },
  { name: "ReverbNation",        url: "https://www.reverbnation.com/{u}",           cat: "Music",     errorType: "status_code" },
  { name: "Audiomack",           url: "https://audiomack.com/{u}",                  cat: "Music",     errorType: "status_code" },
  // Art / Creative
  { name: "DeviantArt",          url: "https://www.deviantart.com/{u}",             cat: "Art",       errorType: "status_code" },
  { name: "ArtStation",          url: "https://www.artstation.com/{u}",             cat: "Art",       errorType: "status_code" },
  { name: "Behance",             url: "https://www.behance.net/{u}",                cat: "Art",       errorType: "status_code" },
  { name: "Dribbble",            url: "https://dribbble.com/{u}",                   cat: "Art",       errorType: "status_code" },
  { name: "Flickr",              url: "https://www.flickr.com/people/{u}/",         cat: "Art",       errorType: "status_code" },
  { name: "500px",               url: "https://500px.com/p/{u}",                    cat: "Art",       errorType: "status_code" },
  { name: "Unsplash",            url: "https://unsplash.com/@{u}",                  cat: "Art",       errorType: "status_code" },
  { name: "Wattpad",             url: "https://www.wattpad.com/user/{u}",           cat: "Art",       errorType: "status_code" },
  { name: "Furaffinity",         url: "https://www.furaffinity.net/user/{u}/",      cat: "Art",       errorType: "status_code" },
  { name: "Pixiv",               url: "https://www.pixiv.net/en/users/{u}",         cat: "Art",       errorType: "status_code" },
  // Forum / Community
  { name: "Reddit",              url: "https://www.reddit.com/user/{u}",            cat: "Forum",     errorType: "status_code" },
  { name: "Quora",               url: "https://www.quora.com/profile/{u}",          cat: "Forum",     errorType: "status_code" },
  { name: "Medium",              url: "https://medium.com/@{u}",                    cat: "Forum",     errorType: "status_code" },
  { name: "Substack",            url: "https://{u}.substack.com/",                  cat: "Forum",     errorType: "status_code" },
  { name: "Disqus",              url: "https://disqus.com/by/{u}/",                 cat: "Forum",     errorType: "status_code" },
  { name: "Discourse",           url: "https://meta.discourse.org/u/{u}",           cat: "Forum",     errorType: "status_code" },
  { name: "Lemmy",               url: "https://lemmy.world/u/{u}",                  cat: "Forum",     errorType: "status_code" },
  { name: "Kbin",                url: "https://kbin.social/u/{u}",                  cat: "Forum",     errorType: "status_code" },
  // Professional
  { name: "AngelList",           url: "https://angel.co/u/{u}",                     cat: "Pro",       errorType: "status_code" },
  { name: "Crunchbase",          url: "https://www.crunchbase.com/person/{u}",      cat: "Pro",       errorType: "status_code" },
  { name: "Product Hunt",        url: "https://www.producthunt.com/@{u}",           cat: "Pro",       errorType: "status_code" },
  { name: "Indie Hackers",       url: "https://www.indiehackers.com/{u}",           cat: "Pro",       errorType: "status_code" },
  { name: "Freelancer",          url: "https://www.freelancer.com/u/{u}",           cat: "Pro",       errorType: "status_code" },
  { name: "Fiverr",              url: "https://www.fiverr.com/{u}",                 cat: "Pro",       errorType: "status_code" },
  { name: "Upwork",              url: "https://www.upwork.com/freelancers/~{u}",    cat: "Pro",       errorType: "status_code" },
  { name: "Toptal",              url: "https://www.toptal.com/resume/{u}",          cat: "Pro",       errorType: "status_code" },
  // Blogging / Writing
  { name: "WordPress",           url: "https://{u}.wordpress.com/",                 cat: "Blog",      errorType: "status_code" },
  { name: "Ghost",               url: "https://{u}.ghost.io/",                      cat: "Blog",      errorType: "status_code" },
  { name: "Blogger",             url: "https://{u}.blogspot.com/",                  cat: "Blog",      errorType: "status_code" },
  { name: "Weebly",              url: "https://{u}.weebly.com/",                    cat: "Blog",      errorType: "status_code" },
  { name: "Squarespace",         url: "https://{u}.squarespace.com/",               cat: "Blog",      errorType: "status_code" },
  // Crypto / Finance
  { name: "Etherscan",           url: "https://etherscan.io/address/{u}",           cat: "Crypto",    errorType: "status_code" },
  { name: "Keybase",             url: "https://keybase.io/{u}",                     cat: "Crypto",    errorType: "status_code" },
  // Dating / Social
  { name: "OkCupid",             url: "https://www.okcupid.com/profile/{u}",        cat: "Social",    errorType: "status_code" },
  { name: "Gravatar",            url: "https://en.gravatar.com/{u}",                cat: "Social",    errorType: "status_code" },
  { name: "About.me",            url: "https://about.me/{u}",                       cat: "Social",    errorType: "status_code" },
  { name: "Linktree",            url: "https://linktr.ee/{u}",                      cat: "Social",    errorType: "status_code" },
  { name: "Carrd",               url: "https://{u}.carrd.co/",                      cat: "Social",    errorType: "status_code" },
  // Fitness / Health
  { name: "Strava",              url: "https://www.strava.com/athletes/{u}",        cat: "Fitness",   errorType: "status_code" },
  { name: "Garmin Connect",      url: "https://connect.garmin.com/modern/profile/{u}", cat: "Fitness", errorType: "status_code" },
  { name: "Fitbit",              url: "https://www.fitbit.com/user/{u}",            cat: "Fitness",   errorType: "status_code" },
  // News / Journalism
  { name: "Flipboard",           url: "https://flipboard.com/@{u}",                 cat: "News",      errorType: "status_code" },
  { name: "Mix",                 url: "https://mix.com/{u}",                        cat: "News",      errorType: "status_code" },
  // Education
  { name: "Duolingo",            url: "https://www.duolingo.com/profile/{u}",       cat: "Edu",       errorType: "status_code" },
  { name: "Coursera",            url: "https://www.coursera.org/user/i/{u}",        cat: "Edu",       errorType: "status_code" },
  { name: "Khan Academy",        url: "https://www.khanacademy.org/profile/{u}",    cat: "Edu",       errorType: "status_code" },
  // Q&A
  { name: "Ask.fm",              url: "https://ask.fm/{u}",                         cat: "Social",    errorType: "status_code" },
  { name: "Formspring",          url: "https://www.formspring.me/{u}",              cat: "Social",    errorType: "status_code" },
  // Photo / Visual
  { name: "VSCO",                url: "https://vsco.co/{u}/gallery",                cat: "Art",       errorType: "status_code" },
  { name: "EyeEm",               url: "https://www.eyeem.com/u/{u}",                cat: "Art",       errorType: "status_code" },
  { name: "Imgur",               url: "https://imgur.com/user/{u}",                 cat: "Art",       errorType: "status_code" },
  { name: "Giphy",               url: "https://giphy.com/{u}",                      cat: "Art",       errorType: "status_code" },
  { name: "Tenor",               url: "https://tenor.com/users/{u}",                cat: "Art",       errorType: "status_code" },
  // E-commerce
  { name: "Etsy",                url: "https://www.etsy.com/shop/{u}",              cat: "Shop",      errorType: "status_code" },
  { name: "eBay",                url: "https://www.ebay.com/usr/{u}",               cat: "Shop",      errorType: "status_code" },
  { name: "Amazon",              url: "https://www.amazon.com/gp/profile/amzn1.account.{u}", cat: "Shop", errorType: "status_code" },
  { name: "Depop",               url: "https://www.depop.com/{u}",                  cat: "Shop",      errorType: "status_code" },
  { name: "Poshmark",            url: "https://poshmark.com/closet/{u}",            cat: "Shop",      errorType: "status_code" },
  // Messaging / Chat
  { name: "Telegram",            url: "https://t.me/{u}",                           cat: "Chat",      errorType: "status_code" },
  { name: "Signal",              url: "https://signal.me/#p/{u}",                   cat: "Chat",      errorType: "status_code" },
  { name: "Discord",             url: "https://discord.com/users/{u}",              cat: "Chat",      errorType: "status_code" },
  { name: "Matrix",              url: "https://matrix.to/#/@{u}:matrix.org",        cat: "Chat",      errorType: "status_code" },
  // Misc
  { name: "Wikipedia",           url: "https://en.wikipedia.org/wiki/User:{u}",     cat: "Misc",      errorType: "status_code" },
  { name: "Patreon",             url: "https://www.patreon.com/{u}",                cat: "Misc",      errorType: "status_code" },
  { name: "Ko-fi",               url: "https://ko-fi.com/{u}",                      cat: "Misc",      errorType: "status_code" },
  { name: "Buy Me a Coffee",     url: "https://www.buymeacoffee.com/{u}",           cat: "Misc",      errorType: "status_code" },
  { name: "OnlyFans",            url: "https://onlyfans.com/{u}",                   cat: "Misc",      errorType: "status_code" },
  { name: "Gumroad",             url: "https://gumroad.com/{u}",                    cat: "Misc",      errorType: "status_code" },
  { name: "Cash App",            url: "https://cash.app/${u}",                      cat: "Misc",      errorType: "status_code" },
  { name: "Venmo",               url: "https://venmo.com/{u}",                      cat: "Misc",      errorType: "status_code" },
  { name: "PayPal",              url: "https://www.paypal.me/{u}",                  cat: "Misc",      errorType: "status_code" },
  { name: "Clubhouse",           url: "https://www.joinclubhouse.com/@{u}",         cat: "Social",    errorType: "status_code" },
  { name: "Periscope",           url: "https://www.pscp.tv/{u}",                    cat: "Video",     errorType: "status_code" },
  { name: "Anchor",              url: "https://anchor.fm/{u}",                      cat: "Misc",      errorType: "status_code" },
  { name: "Spotify Podcasts",    url: "https://podcasters.spotify.com/pod/show/{u}", cat: "Music",    errorType: "status_code" },
  { name: "Pastebin",            url: "https://pastebin.com/u/{u}",                 cat: "Dev",       errorType: "status_code" },
  { name: "Genius",              url: "https://genius.com/{u}",                     cat: "Music",     errorType: "status_code" },
  { name: "GoodReads",           url: "https://www.goodreads.com/{u}",              cat: "Social",    errorType: "status_code" },
  { name: "Letterboxd",          url: "https://letterboxd.com/{u}/",                cat: "Social",    errorType: "status_code" },
  { name: "Untappd",             url: "https://untappd.com/user/{u}",               cat: "Social",    errorType: "status_code" },
  { name: "Foursquare",          url: "https://foursquare.com/{u}",                 cat: "Social",    errorType: "status_code" },
  { name: "Yelp",                url: "https://www.yelp.com/user_details?userid={u}", cat: "Social",  errorType: "status_code" },
  { name: "TripAdvisor",         url: "https://www.tripadvisor.com/members/{u}",    cat: "Social",    errorType: "status_code" },
];

// ── HTTP agent (reuse connections) ────────────────────────────────────────────
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

async function checkSite(site, username) {
  const url = site.url.replace(/\{u\}/g, encodeURIComponent(username));
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      agent: httpsAgent,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 8000,
    });

    const ms = Date.now() - startTime;
    const found = response.status !== 404 && response.status !== 410 && response.status < 500;

    return {
      name: site.name,
      url,
      cat: site.cat,
      found,
      status: response.status,
      ms,
    };
  } catch (err) {
    return {
      name: site.name,
      url,
      cat: site.cat,
      found: false,
      status: 0,
      ms: Date.now() - startTime,
      error: err.message,
    };
  }
}

// ── SSE endpoint ──────────────────────────────────────────────────────────────
app.get("/api/search", async (req, res) => {
  const { username, sites: sitesParam } = req.query;
  if (!username || username.trim().length < 1) {
    return res.status(400).json({ error: "Username required" });
  }

  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

  // Filter sites if a selection was passed
  let targets = SITES;
  if (sitesParam && sitesParam.trim().length > 0) {
    const selected = new Set(sitesParam.split(",").map((s) => s.trim()));
    targets = SITES.filter((s) => selected.has(s.name));
    if (targets.length === 0) targets = SITES; // fallback to all
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("start", { total: targets.length, username: clean });

  const CONCURRENCY = 15;
  let completed = 0;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((s) => checkSite(s, clean)));

    for (const r of results) {
      completed++;
      send("result", { ...r, completed, total: targets.length });
    }

    if (res.writableEnded) break;
  }

  send("done", { total: targets.length, username: clean });
  res.end();
});

app.get("/api/sites", (req, res) => {
  res.json({
    count: SITES.length,
    categories: [...new Set(SITES.map((s) => s.cat))],
    sites: SITES.map((s) => ({ name: s.name, cat: s.cat, url: s.url })),
  });
});

// ── Profile lookup handlers ────────────────────────────────────────────────────
const PROFILE_PLATFORMS = {
  "GitHub": async (u) => {
    const r = await fetch(`https://api.github.com/users/${u}`, { headers: { "User-Agent": "TraceUser/1.0", "Accept": "application/vnd.github.v3+json" }, timeout: 8000 });
    if (!r.ok) throw new Error("User not found");
    const d = await r.json();
    const reposR = await fetch(`https://api.github.com/users/${u}/repos?per_page=6&sort=stars`, { headers: { "User-Agent": "TraceUser/1.0" }, timeout: 8000 });
    const repos = reposR.ok ? await reposR.json() : [];
    return {
      username: d.login, name: d.name, avatar: d.avatar_url,
      bio: d.bio, location: d.location, website: d.blog,
      created: d.created_at ? new Date(d.created_at).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }) : null,
      stats: [
        { label: "Repos", value: d.public_repos },
        { label: "Followers", value: d.followers },
        { label: "Following", value: d.following },
        { label: "Gists", value: d.public_gists },
      ],
      extras: repos.slice(0,6).map(rp => ({ label: rp.name, value: `⭐ ${rp.stargazers_count}`, url: rp.html_url, sub: rp.description })),
      extrasTitle: "Top Repositories",
      profileUrl: d.html_url,
      company: d.company,
      hireable: d.hireable ? "Open to hire" : null,
    };
  },

  "Reddit": async (u) => {
    const r = await fetch(`https://www.reddit.com/user/${u}/about.json`, { headers: { "User-Agent": "TraceUser/1.0" }, timeout: 8000 });
    if (!r.ok) throw new Error("User not found");
    const { data: d } = await r.json();
    return {
      username: d.name, avatar: d.icon_img?.split("?")[0] || null,
      bio: d.subreddit?.public_description || null,
      created: d.created_utc ? new Date(d.created_utc * 1000).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }) : null,
      stats: [
        { label: "Post Karma", value: d.link_karma?.toLocaleString() },
        { label: "Comment Karma", value: d.comment_karma?.toLocaleString() },
        { label: "Awardee Karma", value: d.awardee_karma?.toLocaleString() },
        { label: "Gold", value: d.is_gold ? "Yes" : "No" },
      ],
      badge: d.is_mod ? "Moderator" : d.is_gold ? "Reddit Gold" : null,
      profileUrl: `https://www.reddit.com/u/${u}`,
    };
  },

  "HackerNews": async (u) => {
    const r = await fetch(`https://hacker-news.firebaseio.com/v0/user/${u}.json`, { timeout: 8000 });
    if (!r.ok) throw new Error("User not found");
    const d = await r.json();
    if (!d) throw new Error("User not found");
    return {
      username: d.id, bio: d.about ? d.about.replace(/<[^>]*>/g, "") : null,
      created: d.created ? new Date(d.created * 1000).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }) : null,
      stats: [
        { label: "Karma", value: d.karma?.toLocaleString() },
        { label: "Submissions", value: d.submitted?.length || 0 },
      ],
      profileUrl: `https://news.ycombinator.com/user?id=${u}`,
    };
  },

  "Dev.to": async (u) => {
    const r = await fetch(`https://dev.to/api/users/by_username?url=${u}`, { headers: { "User-Agent": "TraceUser/1.0" }, timeout: 8000 });
    if (!r.ok) throw new Error("User not found");
    const d = await r.json();
    const arts = await fetch(`https://dev.to/api/articles?username=${u}&per_page=6`, { headers: { "User-Agent": "TraceUser/1.0" }, timeout: 8000 });
    const articles = arts.ok ? await arts.json() : [];
    return {
      username: d.username, name: d.name, avatar: d.profile_image,
      bio: d.summary, location: d.location, website: d.website_url,
      created: d.joined_at,
      stats: [
        { label: "Followers", value: d.followers_count },
      ],
      extras: articles.slice(0,6).map(a => ({ label: a.title, value: `❤️ ${a.positive_reactions_count}`, url: a.url, sub: `${a.reading_time_minutes} min read` })),
      extrasTitle: "Latest Articles",
      profileUrl: `https://dev.to/${u}`,
    };
  },

  "npm": async (u) => {
    const r = await fetch(`https://registry.npmjs.org/-/user/org.couchdb.user:${u}`, { timeout: 8000 });
    const pkgs = await fetch(`https://registry.npmjs.org/-/v1/search?text=maintainer:${u}&size=6`, { timeout: 8000 });
    const pkgData = pkgs.ok ? await pkgs.json() : { objects: [] };
    if (!r.ok && pkgData.objects.length === 0) throw new Error("User not found");
    const d = r.ok ? await r.json() : {};
    return {
      username: u, name: d.fullname || u,
      bio: d.description || null,
      website: d.github ? `https://github.com/${d.github}` : null,
      stats: [{ label: "Packages", value: pkgData.total || pkgData.objects.length }],
      extras: pkgData.objects.slice(0,6).map(p => ({ label: p.package.name, value: `v${p.package.version}`, url: `https://npmjs.com/package/${p.package.name}`, sub: p.package.description })),
      extrasTitle: "Published Packages",
      profileUrl: `https://www.npmjs.com/~${u}`,
    };
  },

  "PyPI": async (u) => {
    const r = await fetch(`https://pypi.org/user/${u}/`, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 8000 });
    if (!r.ok) throw new Error("User not found");
    const html = await r.text();
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const packages = [...html.matchAll(/href="\/project\/([^/]+)\/"/g)].map(m => m[1]);
    return {
      username: u, name: nameMatch ? nameMatch[1].trim() : u,
      stats: [{ label: "Packages", value: packages.length }],
      extras: [...new Set(packages)].slice(0,6).map(p => ({ label: p, url: `https://pypi.org/project/${p}/` })),
      extrasTitle: "Packages",
      profileUrl: `https://pypi.org/user/${u}/`,
    };
  },

  "Stack Overflow": async (u) => {
    const r = await fetch(`https://api.stackexchange.com/2.3/users?inname=${u}&site=stackoverflow&filter=!9Z(-wwYGT`, { timeout: 8000 });
    if (!r.ok) throw new Error("API error");
    const d = await r.json();
    const user = d.items?.find(i => i.display_name.toLowerCase() === u.toLowerCase()) || d.items?.[0];
    if (!user) throw new Error("User not found");
    return {
      username: user.display_name, avatar: user.profile_image,
      location: user.location, website: user.website_url,
      created: user.creation_date ? new Date(user.creation_date * 1000).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }) : null,
      stats: [
        { label: "Reputation", value: user.reputation?.toLocaleString() },
        { label: "Gold Badges", value: user.badge_counts?.gold },
        { label: "Silver Badges", value: user.badge_counts?.silver },
        { label: "Bronze Badges", value: user.badge_counts?.bronze },
      ],
      profileUrl: user.link,
    };
  },

  "Lichess": async (u) => {
    const r = await fetch(`https://lichess.org/api/user/${u}`, { headers: { "Accept": "application/json" }, timeout: 8000 });
    if (!r.ok) throw new Error("User not found");
    const d = await r.json();
    return {
      username: d.username, bio: d.profile?.bio, location: d.profile?.location,
      created: d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }) : null,
      stats: [
        { label: "Rating (Rapid)", value: d.perfs?.rapid?.rating },
        { label: "Rating (Blitz)", value: d.perfs?.blitz?.rating },
        { label: "Rating (Bullet)", value: d.perfs?.bullet?.rating },
        { label: "Games Played", value: d.count?.all?.toLocaleString() },
        { label: "Wins", value: d.count?.win?.toLocaleString() },
      ],
      badge: d.title || null,
      profileUrl: `https://lichess.org/@/${u}`,
    };
  },

  "Gravatar": async (u) => {
    const crypto = require("crypto");
    const hash = crypto.createHash("md5").update(u.toLowerCase().trim()).digest("hex");
    const r = await fetch(`https://en.gravatar.com/${hash}.json`, { timeout: 8000 });
    if (!r.ok) throw new Error("User not found");
    const d = (await r.json()).entry?.[0];
    if (!d) throw new Error("User not found");
    return {
      username: d.preferredUsername, name: d.displayName,
      avatar: d.thumbnailUrl + "?size=200",
      bio: d.aboutMe,
      location: d.currentLocation,
      website: d.urls?.[0]?.value,
      stats: [],
      profileUrl: `https://gravatar.com/${d.preferredUsername}`,
    };
  },

  "Speedrun.com": async (u) => {
    const r = await fetch(`https://www.speedrun.com/api/v1/users/${u}`, { timeout: 8000 });
    if (!r.ok) throw new Error("User not found");
    const { data: d } = await r.json();
    const runs = await fetch(`https://www.speedrun.com/api/v1/runs?user=${d.id}&status=verified&orderby=date&direction=desc&max=6`, { timeout: 8000 });
    const runData = runs.ok ? (await runs.json()).data : [];
    return {
      username: d.names?.international, name: d.names?.japanese || null,
      location: d.location?.country?.names?.international,
      created: d.signup ? new Date(d.signup).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }) : null,
      stats: [{ label: "Role", value: d.role }],
      badge: d.role !== "user" ? d.role : null,
      extras: runData.slice(0,6).map(r => ({ label: r.category, value: r.times?.realtime_t ? formatTime(r.times.realtime_t) : "—", url: r.weblink })),
      extrasTitle: "Recent Runs",
      profileUrl: d.weblink,
    };
  },
};

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60);
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}


// ── Platform user-search: search many users on one platform ───────────────────
const PLATFORM_SEARCHERS = {
  "GitHub": async (query, limit = 20) => {
    const r = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=${Math.min(limit,30)}`,
      { headers: { "User-Agent":"TraceUser/1.0","Accept":"application/vnd.github.v3+json" }, timeout:10000 }
    );
    if (!r.ok) throw new Error("GitHub API error");
    const { items } = await r.json();
    const profiles = await Promise.all(
      items.slice(0, 20).map(async (u) => {
        try {
          const pr = await fetch(`https://api.github.com/users/${u.login}`,
            { headers:{"User-Agent":"TraceUser/1.0"}, timeout:6000 });
          if (!pr.ok) return { username:u.login, avatar:u.avatar_url, profileUrl:u.html_url, stats:[] };
          const d = await pr.json();
          return {
            username:d.login, name:d.name, avatar:d.avatar_url,
            bio:d.bio, location:d.location, website:d.blog, company:d.company,
            profileUrl:d.html_url,
            joined: d.created_at ? new Date(d.created_at).toLocaleDateString("en-US",{year:"numeric",month:"short"}) : null,
            stats:[
              {label:"Repos", value:d.public_repos},
              {label:"Followers", value:d.followers},
              {label:"Following", value:d.following},
            ],
          };
        } catch { return { username:u.login, avatar:u.avatar_url, profileUrl:u.html_url, stats:[] }; }
      })
    );
    return profiles;
  },

  "Stack Overflow": async (query, limit = 20) => {
    const r = await fetch(
      `https://api.stackexchange.com/2.3/users?inname=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${limit}&order=desc&sort=reputation`,
      { timeout:10000 }
    );
    if (!r.ok) throw new Error("Stack Overflow API error");
    const { items } = await r.json();
    return (items||[]).map(u => ({
      username:u.display_name, avatar:u.profile_image, location:u.location, website:u.website_url,
      profileUrl:u.link,
      joined: u.creation_date ? new Date(u.creation_date*1000).toLocaleDateString("en-US",{year:"numeric",month:"short"}) : null,
      stats:[
        {label:"Reputation", value:u.reputation?.toLocaleString()},
        {label:"Gold 🥇", value:u.badge_counts?.gold},
        {label:"Silver 🥈", value:u.badge_counts?.silver},
        {label:"Bronze 🥉", value:u.badge_counts?.bronze},
      ],
    }));
  },

  "Lichess": async (query, limit = 15) => {
    const r = await fetch(
      `https://lichess.org/api/player/search?term=${encodeURIComponent(query)}&nb=${limit}`,
      { headers:{"Accept":"application/json"}, timeout:10000 }
    );
    if (!r.ok) throw new Error("Lichess API error");
    const data = await r.json();
    const users = Array.isArray(data) ? data : (data.results || []);
    const details = await Promise.all(
      users.slice(0,15).map(async (u) => {
        const id = u.id || u;
        try {
          const pr = await fetch(`https://lichess.org/api/user/${id}`,
            { headers:{"Accept":"application/json"}, timeout:5000 });
          if (!pr.ok) return { username:id, profileUrl:`https://lichess.org/@/${id}`, stats:[] };
          const d = await pr.json();
          return {
            username:d.username, bio:d.profile?.bio, location:d.profile?.location,
            profileUrl:`https://lichess.org/@/${d.username}`, badge:d.title||null,
            joined: d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-US",{year:"numeric",month:"short"}) : null,
            stats:[
              {label:"Rapid", value:d.perfs?.rapid?.rating},
              {label:"Blitz", value:d.perfs?.blitz?.rating},
              {label:"Bullet", value:d.perfs?.bullet?.rating},
              {label:"Games", value:d.count?.all?.toLocaleString()},
            ],
          };
        } catch { return { username:id, profileUrl:`https://lichess.org/@/${id}`, stats:[] }; }
      })
    );
    return details;
  },

  "Dev.to": async (query, limit = 20) => {
    const r = await fetch(
      `https://dev.to/api/articles?per_page=${limit}&tag=${encodeURIComponent(query)}`,
      { headers:{"User-Agent":"TraceUser/1.0"}, timeout:10000 }
    );
    if (!r.ok) throw new Error("Dev.to API error");
    const articles = await r.json();
    const seen = new Set(); const authors = [];
    for (const a of articles) {
      if (!seen.has(a.user.username)) { seen.add(a.user.username); authors.push(a.user); }
    }
    return authors.map(u => ({
      username:u.username, name:u.name, avatar:u.profile_image_90,
      profileUrl:`https://dev.to/${u.username}`, stats:[],
    }));
  },

  "npm": async (query, limit = 20) => {
    const r = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`,
      { timeout:10000 }
    );
    if (!r.ok) throw new Error("npm API error");
    const { objects } = await r.json();
    const seen = new Set(); const authors = [];
    for (const obj of objects) {
      const pub = obj.package.publisher?.username;
      if (pub && !seen.has(pub)) { seen.add(pub); authors.push({ username:pub, pkg:obj.package }); }
    }
    return authors.map(a => ({
      username:a.username, profileUrl:`https://www.npmjs.com/~${a.username}`,
      bio:`Publisher of ${a.pkg.name} and more`, stats:[],
    }));
  },

  "Codeforces": async (query) => {
    // try exact lookup first
    const results = [];
    const handles = [query];
    for (const handle of handles) {
      try {
        const pr = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`, { timeout:8000 });
        if (!pr.ok) continue;
        const { result } = await pr.json();
        const u = result?.[0]; if (!u) continue;
        results.push({
          username:u.handle,
          name:`${u.firstName||""} ${u.lastName||""}`.trim()||null,
          avatar:u.avatar?.startsWith("http") ? u.avatar : `https:${u.avatar}`,
          location: u.city ? `${u.city}, ${u.country||""}` : u.country,
          profileUrl:`https://codeforces.com/profile/${u.handle}`,
          badge:u.rank, joined: u.registrationTimeSeconds ? new Date(u.registrationTimeSeconds*1000).toLocaleDateString("en-US",{year:"numeric",month:"short"}) : null,
          stats:[
            {label:"Rating", value:u.rating},
            {label:"Max Rating", value:u.maxRating},
            {label:"Rank", value:u.rank},
            {label:"Contribution", value:u.contribution},
          ],
        });
      } catch {}
    }
    return results;
  },
};

const SEARCH_PLATFORMS = [
  { name:"GitHub",         icon:"💻", cat:"Dev",    note:"Search by name, username, or language" },
  { name:"Stack Overflow", icon:"📚", cat:"Dev",    note:"Search users by display name" },
  { name:"Lichess",        icon:"♟️",  cat:"Gaming", note:"Chess players by username" },
  { name:"Dev.to",         icon:"📝", cat:"Dev",    note:"Authors by topic/tag" },
  { name:"npm",            icon:"📦", cat:"Dev",    note:"Package publishers by keyword" },
  { name:"Codeforces",     icon:"⚔️", cat:"Dev",    note:"Competitive programmer by handle" },
];

app.get("/api/search-platforms", (req, res) => {
  res.json({ platforms: SEARCH_PLATFORMS });
});

app.get("/api/platform-search", async (req, res) => {
  const { platform, query, limit=20 } = req.query;
  if (!platform || !query) return res.status(400).json({ error:"platform and query required" });
  const handler = PLATFORM_SEARCHERS[platform];
  if (!handler) return res.status(400).json({ error:"Platform not supported" });
  try {
    const users = await handler(query.trim(), parseInt(limit)||20);
    res.json({ ok:true, platform, query, count:users.length, users });
  } catch(err) {
    res.status(500).json({ ok:false, error:err.message||"Search failed" });
  }
});


// ── Web Intel Search ──────────────────────────────────────────────────────────
// Uses DuckDuckGo Instant Answer API + multiple free public search sources
app.get("/api/intel-search", async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: "Query required" });
  }
  const q = query.trim();

  const results = {
    query: q,
    timestamp: new Date().toISOString(),
    sources: []
  };

  // Run all searches in parallel
  const tasks = await Promise.allSettled([

    // 1. DuckDuckGo Instant Answer API (completely free, no key)
    fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`, {
      headers: { "User-Agent": "TraceUser/1.0" }, timeout: 8000
    }).then(async r => {
      if (!r.ok) return;
      const d = await r.json();
      const items = [];

      if (d.AbstractText) items.push({ type: "summary", text: d.AbstractText, source: d.AbstractSource, url: d.AbstractURL });
      if (d.Answer) items.push({ type: "answer", text: d.Answer, subtype: d.AnswerType });
      if (d.Definition) items.push({ type: "definition", text: d.Definition, source: d.DefinitionSource });
      if (d.Image && d.Image !== "") items.push({ type: "image", url: d.Image });

      const related = (d.RelatedTopics || []).slice(0, 8).map(t => ({
        text: t.Text || (t.Topics ? t.Name : null),
        url: t.FirstURL,
        icon: t.Icon?.URL || null
      })).filter(t => t.text);

      if (d.Infobox?.content?.length) {
        items.push({
          type: "infobox",
          heading: d.Infobox.meta?.find(m => m.label === "article_title")?.value || q,
          fields: d.Infobox.content.slice(0, 20).map(f => ({ label: f.label, value: String(f.value) }))
        });
      }

      results.sources.push({
        name: "DuckDuckGo Instant Answer",
        icon: "🦆",
        type: "instant",
        items,
        related
      });
    }),

    // 2. Wikipedia search
    fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&srprop=snippet|titlesnippet|size&format=json&origin=*`, {
      headers: { "User-Agent": "TraceUser/1.0" }, timeout: 8000
    }).then(async r => {
      if (!r.ok) return;
      const d = await r.json();
      const hits = d.query?.search || [];
      if (!hits.length) return;

      // Fetch summary for top result
      let topSummary = null;
      try {
        const sr = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hits[0].title)}`, {
          headers: { "User-Agent": "TraceUser/1.0" }, timeout: 5000
        });
        if (sr.ok) {
          const sd = await sr.json();
          topSummary = {
            extract: sd.extract,
            thumbnail: sd.thumbnail?.source || null,
            description: sd.description,
            url: sd.content_urls?.desktop?.page
          };
        }
      } catch {}

      results.sources.push({
        name: "Wikipedia",
        icon: "📖",
        type: "wiki",
        topSummary,
        results: hits.map(h => ({
          title: h.title,
          snippet: h.snippet.replace(/<[^>]*>/g, ""),
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title)}`,
          size: h.size
        }))
      });
    }),

    // 3. OpenStreetMap / Nominatim (address/location lookup)
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1&extratags=1`, {
      headers: { "User-Agent": "TraceUser/1.0" }, timeout: 8000
    }).then(async r => {
      if (!r.ok) return;
      const places = await r.json();
      if (!places.length) return;
      results.sources.push({
        name: "Location / Address",
        icon: "📍",
        type: "location",
        places: places.map(p => ({
          name: p.display_name,
          type: p.type,
          category: p.class,
          lat: p.lat,
          lon: p.lon,
          address: p.address,
          mapUrl: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=15/${p.lat}/${p.lon}`,
          tags: p.extratags || {}
        }))
      });
    }),

    // 4. Wikidata entity search (structured data — birth, death, professions etc.)
    fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&limit=3&format=json&origin=*`, {
      headers: { "User-Agent": "TraceUser/1.0" }, timeout: 8000
    }).then(async r => {
      if (!r.ok) return;
      const d = await r.json();
      const entities = d.search || [];
      if (!entities.length) return;

      // Fetch properties for top entity
      const topId = entities[0].id;
      let props = [];
      try {
        const pr = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${topId}.json`, {
          headers: { "User-Agent": "TraceUser/1.0" }, timeout: 6000
        });
        if (pr.ok) {
          const pd = await pr.json();
          const entity = pd.entities?.[topId];
          const PROP_LABELS = {
            P21: "Gender", P19: "Place of birth", P20: "Place of death",
            P569: "Date of birth", P570: "Date of death", P27: "Country of citizenship",
            P106: "Occupation", P31: "Instance of", P17: "Country",
            P571: "Founded", P576: "Dissolved", P18: "Image",
            P856: "Website", P625: "Coordinates", P421: "Timezone"
          };
          for (const [propId, label] of Object.entries(PROP_LABELS)) {
            const claims = entity?.claims?.[propId];
            if (!claims?.length) continue;
            const val = claims[0]?.mainsnak?.datavalue?.value;
            if (!val) continue;
            let strVal = "";
            if (typeof val === "string") strVal = val;
            else if (val.time) strVal = val.time.replace(/\+/, "").slice(0, 10).replace(/^-/, "~");
            else if (val.text) strVal = val.text;
            else if (val.id) strVal = val.id; // will be entity ID, skip complex lookups
            if (strVal && !strVal.startsWith("Q")) props.push({ label, value: strVal });
          }
        }
      } catch {}

      results.sources.push({
        name: "Wikidata (Structured Facts)",
        icon: "🗃️",
        type: "wikidata",
        entities: entities.map(e => ({
          id: e.id,
          label: e.label,
          description: e.description,
          url: `https://www.wikidata.org/wiki/${e.id}`
        })),
        props
      });
    }),

    // 5. Open Library — books/authors
    fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5&fields=title,author_name,first_publish_year,subject,cover_i`, {
      headers: { "User-Agent": "TraceUser/1.0" }, timeout: 8000
    }).then(async r => {
      if (!r.ok) return;
      const d = await r.json();
      const books = d.docs || [];
      if (!books.length) return;
      results.sources.push({
        name: "Books (Open Library)",
        icon: "📚",
        type: "books",
        books: books.slice(0, 5).map(b => ({
          title: b.title,
          authors: b.author_name?.join(", "),
          year: b.first_publish_year,
          subjects: b.subject?.slice(0, 4),
          cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
          url: `https://openlibrary.org/search?q=${encodeURIComponent(b.title)}`
        }))
      });
    }),

    // 6. NewsAPI-compatible: GNews (free tier, no key needed for basic)
    fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&max=6&apikey=free`, {
      headers: { "User-Agent": "TraceUser/1.0" }, timeout: 6000
    }).then(async r => {
      // GNews free key often fails — fallback gracefully
      if (!r.ok) return;
      const d = await r.json();
      const articles = d.articles || [];
      if (!articles.length) return;
      results.sources.push({
        name: "News",
        icon: "📰",
        type: "news",
        articles: articles.slice(0, 6).map(a => ({
          title: a.title,
          description: a.description,
          url: a.url,
          source: a.source?.name,
          publishedAt: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}) : null,
          image: a.image
        }))
      });
    }),

  ]);

  // Filter empty sources
  results.sources = results.sources.filter(Boolean);
  results.sourceCount = results.sources.length;

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Username Searcher running on port ${PORT}`);
});
