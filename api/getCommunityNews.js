/**
 * Vercel Serverless Function — getCommunityNews
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches the latest post from the @tochilka_online Telegram channel.
 * Vercel automatically deploys this as a Serverless Function at /api/getCommunityNews
 * 
 * Security:
 *   - The TG_BOT_TOKEN environment variable MUST be set in Vercel Project Settings.
 *   - Never commit the token to the repository.
 */

// In-memory cache to prevent hammering Telegram API from the same lambda instance
let cache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function sanitiseText(raw = "") {
  return raw
    .replace(/<[^>]*>/g, "")          // strip HTML
    .replace(/\*\*(.*?)\*\*/g, "$1")  // bold
    .replace(/__(.*?)__/g, "$1")      // underline
    .replace(/`([^`]+)`/g, "$1")      // code spans
    .trim()
    .slice(0, 1000);
}

function buildPostUrl(channelUsername, messageId) {
  const name = channelUsername.replace(/^@/, "");
  return `https://t.me/${name}/${messageId}?comment=1`;
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Set CORS headers just in case, though usually frontend and api share the domain on Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ ok: true, data: cache.data, cached: true });
  }

  const token = process.env.TG_BOT_TOKEN;
  const channel = process.env.TG_CHANNEL || "@tochilka_online";

  if (!token) {
    return res.status(500).json({ ok: false, error: 'TG_BOT_TOKEN is not configured in Vercel Env' });
  }

  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates?allowed_updates=["channel_post"]&limit=100`;
    const tgRes = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!tgRes.ok) {
      // If Telegram returns an HTTP error, try to parse its error JSON
      const errorText = await tgRes.text();
      let errorJson = {};
      try { errorJson = JSON.parse(errorText); } catch(e) {}
      
      throw new Error(`Telegram API Error: ${tgRes.status} ${tgRes.statusText} - ${errorJson.description || errorText}`);
    }

    const json = await tgRes.json();
    if (!json.ok) {
      throw new Error(json.description || JSON.stringify(json));
    }

    const channelNorm = channel.toLowerCase().replace(/^@/, "");
    
    // Diagnostic: Keep all raw channel posts to see what we actually received
    const allChannelPosts = (json.result || [])
      .filter(u => u.channel_post)
      .map(u => ({
        id: u.channel_post.message_id,
        chat_username: u.channel_post.chat?.username,
        has_text: !!(u.channel_post.text || u.channel_post.caption),
        has_media: !!(u.channel_post.photo || u.channel_post.video)
      }));

    const posts = (json.result || [])
      .filter(u => {
        const cp = u.channel_post;
        if (!cp) return false;
        const text = cp.text || cp.caption;
        if (!text && !cp.photo && !cp.video) return false;
        const username = (cp.chat?.username || "").toLowerCase();
        return username === channelNorm;
      })
      .map(u => u.channel_post)
      .sort((a, b) => b.message_id - a.message_id);

    if (posts.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=5'); // Short cache for debugging
      return res.status(200).json({ 
        ok: true, 
        data: null, 
        cached: false,
        debug_info: {
          reason: "No matching text/media posts found for this channel.",
          target_channel: channelNorm,
          telegram_result_count: (json.result || []).length,
          all_received_posts_info: allChannelPosts,
          raw_telegram_response: json
        }
      });
    }

    const post = posts[0];
    const postText = post.text || post.caption || "";
    const postData = {
      id:          post.message_id,
      text:        sanitiseText(postText),
      date:        new Date(post.date * 1000).toISOString(),
      channelName: post.chat?.username || channelNorm,
      postUrl:     buildPostUrl(channel, post.message_id),
      imageData:   null,
      isVideo:     false
    };

    // --- Media Extraction ---
    let fileIdToFetch = null;

    if (post.video && (post.video.thumbnail || post.video.thumb)) {
      postData.isVideo = true;
      const thumb = post.video.thumbnail || post.video.thumb;
      fileIdToFetch = thumb.file_id;
    } else if (post.photo && post.photo.length > 0) {
      // Telegram sends multiple sizes. Find one with width close to 320px
      // Array is usually sorted by size, smallest to largest.
      let bestPhoto = post.photo[0];
      for (const p of post.photo) {
        if (p.width <= 400) {
          bestPhoto = p;
        } else {
          break;
        }
      }
      fileIdToFetch = bestPhoto.file_id;
    }

    if (fileIdToFetch) {
      try {
        const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileIdToFetch}`);
        const fileJson = await fileRes.json();
        if (fileJson.ok && fileJson.result.file_path) {
          const dlRes = await fetch(`https://api.telegram.org/file/bot${token}/${fileJson.result.file_path}`);
          if (dlRes.ok) {
            const arrayBuffer = await dlRes.arrayBuffer();
            postData.imageData = Buffer.from(arrayBuffer).toString('base64');
          }
        }
      } catch (e) {
        console.error("Failed to fetch media:", e);
      }
    }

    // Update instance cache
    cache = { data: postData, fetchedAt: now };

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ ok: true, data: postData, cached: false });
  } catch (err) {
    console.error("Vercel Function Error:", err);
    // Explicitly return 500 with full error details for debugging
    return res.status(500).json({ 
      ok: false, 
      data: null, 
      error: err.message,
      stack: err.stack 
    });
  }
}
