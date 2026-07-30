/**
 * CommunityNewsCard — «На острие пера»
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the latest post from the @tochilka_online Telegram channel.
 *
 * 8 interactive states:
 *   Loading  → elegant pulsing skeleton lines (no spinners)
 *   Success  → post text (line-clamp-3) + deep-link CTA button
 *   Fallback → friendly static block + direct channel link (no red alerts)
 *   Hover    → card lifts translateY(-4px) in 200ms cubic-bezier(0.25,1,0.5,1)
 *   Focus    → :focus-visible ring 2px academic blue (#1B4F72)
 *   Active   → card settles back to translateY(-1px)
 *   Dark     → adapts via CSS variable tokens
 *   Reduced  → respects prefers-reduced-motion (CSS level)
 *
 * Architecture contract:
 *   - No Telegram iframe widgets, no Bot Token here
 *   - All data comes from getCommunityNews() in services/database.js
 *   - Component owns ONLY presentation logic
 */

import { useState, useEffect, useCallback } from "react";
import { PlayCircle } from "lucide-react";
import { getCommunityNews } from "../../services/database.js";

// ── Constants ─────────────────────────────────────────────────────────────

const CHANNEL_URL   = "https://t.me/tochilka_online";
const CHANNEL_NAME  = "@tochilka_online";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

// ── Telegram Icon (inline SVG — no extra dep) ─────────────────────────────

export function TelegramIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

// ── Skeleton Loader ───────────────────────────────────────────────────────

function NewsCardSkeleton() {
  return (
    <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-2xl p-6 space-y-5" aria-busy="true" aria-label="Загрузка новости сообщества">
      {/* Title / date line */}
      <div className="skeleton-line-sm w-24" />

      {/* Text block — 3 lines mimicking line-clamp-3 */}
      <div className="space-y-2.5">
        <div className="skeleton-line w-full" />
        <div className="skeleton-line w-5/6" style={{ animationDelay: "0.15s" }} />
        <div className="skeleton-line w-4/6" style={{ animationDelay: "0.3s" }} />
      </div>

      {/* Button skeleton */}
      <div className="skeleton-line w-full h-9 rounded-xl" style={{ height: "2.75rem" }} />
    </div>
  );
}

// ── Fallback State (graceful degradation) ─────────────────────────────────

function NewsCardFallback() {
  return (
    <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-2xl p-6 space-y-4 animate-card-float-in">
      {/* Body */}
      <p className="text-sm text-stone-500 leading-relaxed">
        Полезные инструменты для преподавателей в одном месте. Делимся инсайтами, переводим новости на человеческий язык и обсуждаем наболевшее.
      </p>

      {/* CTA — direct channel link */}
      <a
        href={CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        id="community-fallback-link"
        data-action="community_link_clicked"
        className="
          group inline-flex w-full items-center justify-center gap-2
          px-4 py-3 rounded-xl
          text-sm font-medium text-white
          bg-academic-blue hover:bg-academic-blue-light
          shadow-sm hover:shadow-md
          transition-all duration-300
          outline-none focus-visible:ring-2 focus-visible:ring-academic-blue focus-visible:ring-offset-2
          active:scale-[0.97]
        "
      >
        <TelegramIcon size={16} className="transition-transform duration-200 group-hover:scale-110" />
        Перейти в канал
      </a>
    </div>
  );
}

// ── Format date helper ────────────────────────────────────────────────────

function formatPostDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const now = new Date();
  const diffH = (now - d) / 3_600_000;

  if (diffH < 1)    return "только что";
  if (diffH < 24)   return `${Math.floor(diffH)} ч назад`;
  if (diffH < 48)   return "вчера";

  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

// ── Main Component ────────────────────────────────────────────────────────

export default function CommunityNewsCard() {
  const [status, setStatus]  = useState("loading"); // "loading" | "success" | "fallback"
  const [post, setPost]      = useState(null);

  const fetchNews = useCallback(async () => {
    const data = await getCommunityNews();
    if (data) {
      setPost(data);
      setStatus("success");
    } else {
      setStatus("fallback");
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const timer = setInterval(fetchNews, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchNews]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (status === "loading") return <NewsCardSkeleton />;

  // ── Fallback / Error state ─────────────────────────────────────────────
  if (status === "fallback" || !post) return <NewsCardFallback />;

  // ── Success state ──────────────────────────────────────────────────────
  const deepLink = `https://t.me/${post.channelName.replace(/^@/, "")}/${post.id}?comment=1`;

  return (
    <article
      className="
        bg-white shadow-sm ring-1 ring-slate-200 rounded-2xl p-6 space-y-4
        card-hover-lift animate-card-float-in hover:shadow-md hover:ring-black/10 transition-all duration-300
      "
      aria-labelledby="community-news-title"
    >
      {/* ── Header details ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-[#1B4F72] uppercase tracking-widest mt-0.5">
          {CHANNEL_NAME}
        </p>
        
        {/* Timestamp */}
        <time
          dateTime={post.date}
          className="text-xs font-medium text-stone-400 shrink-0 mt-0.5 tabular-nums"
        >
          {formatPostDate(post.date)}
        </time>
      </div>

      {/* ── Media Attachment ─────────────────────────────────────────────── */}
      {post.imageData && (
        <a 
          href={deepLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block relative w-full h-48 sm:h-52 overflow-hidden rounded-xl border border-stone-100 group shadow-sm transition-transform active:scale-[0.98]"
        >
          <img 
            src={`data:image/jpeg;base64,${post.imageData}`} 
            alt="Вложение поста" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {post.isVideo && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-colors group-hover:bg-black/30 backdrop-blur-[1px]">
              <PlayCircle size={48} strokeWidth={1.5} className="text-white drop-shadow-md transition-transform duration-300 group-hover:scale-110" />
            </div>
          )}
        </a>
      )}

      {/* ── Post text (line-clamp-3) ─────────────────────────────────────── */}
      <p
        className="
          text-sm text-stone-700 leading-relaxed
          line-clamp-3 overflow-hidden
        "
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {post.text}
      </p>

      {/* ── CTA button: deep link to comments ───────────────────────────── */}
      <a
        href={deepLink}
        target="_blank"
        rel="noopener noreferrer"
        id="community-discuss-link"
        data-action="community_link_clicked"
        className="
          group inline-flex w-full items-center justify-center gap-2
          px-4 py-3 rounded-xl
          text-sm font-medium text-white
          bg-academic-blue hover:bg-academic-blue-light
          shadow-sm hover:shadow-md
          transition-all duration-300
          outline-none focus-visible:ring-2 focus-visible:ring-academic-blue focus-visible:ring-offset-2
          active:scale-[0.97]
        "
        aria-label="Обсудить публикацию с коллегами в Telegram"
      >
        <TelegramIcon size={16} className="transition-transform duration-200 group-hover:scale-110" />
        Обсудить с коллегами
      </a>
    </article>
  );
}
