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
  const { username } = req.query;
  if (!username || username.trim().length < 1) {
    return res.status(400).json({ error: "Username required" });
  }

  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("start", { total: SITES.length, username: clean });

  // Process in concurrent batches of 15
  const CONCURRENCY = 15;
  let completed = 0;

  for (let i = 0; i < SITES.length; i += CONCURRENCY) {
    const batch = SITES.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((s) => checkSite(s, clean)));

    for (const r of results) {
      completed++;
      send("result", { ...r, completed, total: SITES.length });
    }

    if (res.writableEnded) break;
  }

  send("done", { total: SITES.length, username: clean });
  res.end();
});

app.get("/api/sites", (req, res) => {
  res.json({ count: SITES.length, categories: [...new Set(SITES.map((s) => s.cat))] });
});

app.listen(PORT, () => {
  console.log(`Username Searcher running on port ${PORT}`);
});
