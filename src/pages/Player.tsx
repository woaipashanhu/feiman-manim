import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideo, PLAYAUTH_API } from '../data/videos';

type SwipeDirection = 'none' | 'left' | 'right';

declare global {
  interface Window { Aliplayer: any }
}

const ALIPLAYER_BASE = '/feiman-manim/aliplayer';

// ====== 视频缓存查找 ======

const VIDEO_URL_MAP_KEY = 'video-url-map';

/** 保存 videoId → mp4 URL 映射（前端拦截或主动查询时写入） */
function saveVideoUrl(videoId: string, url: string) {
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(VIDEO_URL_MAP_KEY) || '{}');
    if (map[videoId] !== url) {
      map[videoId] = url;
      localStorage.setItem(VIDEO_URL_MAP_KEY, JSON.stringify(map));
      console.log(`[视频缓存] 保存映射 ${videoId} → ${url}`);
    }
  } catch { /* ignore */ }
}

/** 读取 videoId 对应的缓存 URL */
function getVideoUrl(videoId: string): string | null {
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(VIDEO_URL_MAP_KEY) || '{}');
    return map[videoId] || null;
  } catch { return null; }
}

/**
 * 在所有 SW 缓存中查找视频
 * 遍历 precache + runtime caches，匹配 videoId 对应的 mp4
 */
async function findCachedVideo(videoId: string): Promise<string | null> {
  if (!('caches' in window)) return null;

  const allCaches = await caches.keys();
  for (const cacheName of allCaches) {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      for (const req of requests) {
        const url = req.url;
        // 匹配 mp4 文件，且检查 URL 中是否包含 videoId 或 URL 映射
        if (/\.mp4(\?|$)/i.test(url)) {
          // 方法1: 直接在 URL 中找 videoId（OSS 路径可能不含 videoId）
          if (url.includes(videoId)) return cleanUrl(url);
        }
      }
    } catch { /* ignore */ }
  }

  // 方法2: 从 localStorage 的 URL 映射查找
  const savedUrl = getVideoUrl(videoId);
  if (savedUrl) {
    // 在所有缓存中查找这个 URL（忽略签名参数）
    for (const cacheName of allCaches) {
      try {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        for (const req of requests) {
          const clean = cleanUrl(req.url);
          if (clean === savedUrl) return clean;
          // 也匹配路径部分（因为 precache key 可能带 __WB_REVISION__）
          try {
            const cachedPath = new URL(req.url).pathname;
            const savedPath = new URL(savedUrl, window.location.origin).pathname;
            if (cachedPath === savedPath) return clean;
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }
  }

  return null;
}

/** 去掉 URL 查询参数，返回纯路径 */
function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch { return url.split('?')[0]; }
}

// ====== 请求拦截：捕获播放器请求的 mp4 URL ======

function setupInterceptors(videoId: string): () => void {
  const originalFetch = window.fetch;

  const patchedFetch: typeof window.fetch = async (input, init) => {
    try {
      const response = await originalFetch.call(window, input, init);
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (/\.mp4(\?|$)/i.test(url)) {
        saveVideoUrl(videoId, cleanUrl(url));
      }
      return response;
    } catch (err) {
      throw err;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalOpen: any = XMLHttpRequest.prototype.open;
  const patchedOpen = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
    const urlStr = typeof url === 'string' ? url : url.href;
    if (/\.mp4(\?|$)/i.test(urlStr)) {
      saveVideoUrl(videoId, cleanUrl(urlStr));
    }
    return originalOpen.call(this, method, url, ...rest);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).fetch = patchedFetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (XMLHttpRequest as any).prototype.open = patchedOpen;

  return () => {
    (window as any).fetch = originalFetch;
    (XMLHttpRequest as any).prototype.open = originalOpen;
  };
}

// ====== 播放器资源加载 ======

function loadPlayerAssets(): Promise<void> {
  if (window.Aliplayer) return Promise.resolve();

  const loadScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`加载播放器失败: ${src}`));
      document.head.appendChild(s);
    });

  const loadCSS = (href: string): Promise<void> =>
    new Promise((resolve) => {
      if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });

  return Promise.all([
    loadCSS(`${ALIPLAYER_BASE}/skins/default/aliplayer-min.css`),
    loadScript(`${ALIPLAYER_BASE}/aliplayer-min.js`),
  ]).then(() => {});
}

// ====== 原生离线视频播放器 ======

function createNativePlayer(
  container: HTMLDivElement,
  url: string,
  callbacks: { onLoad: () => void; onError: (msg: string) => void }
) {
  container.innerHTML = '';
  const videoEl = document.createElement('video');
  videoEl.src = url;
  videoEl.controls = true;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.style.width = '100%';
  videoEl.style.height = '100%';
  videoEl.style.objectFit = 'contain';
  videoEl.style.backgroundColor = '#000';

  videoEl.addEventListener('canplay', () => callbacks.onLoad());
  videoEl.addEventListener('playing', () => callbacks.onLoad());
  videoEl.addEventListener('error', () => callbacks.onError('缓存播放失败，请联网后重试'));
  container.appendChild(videoEl);
  return videoEl;
}

// ====== 主组件 ======

export default function Player() {
  const { gradeId = '', videoIndex = '0' } = useParams();
  const navigate = useNavigate();
  const currentIndex = parseInt(videoIndex, 10);

  const { video, grade, prevIndex, nextIndex } = getVideo(gradeId, currentIndex);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [swipeAnim, setSwipeAnim] = useState<SwipeDirection>('none');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retries, setRetries] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // 监听网络状态
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // 初始化播放器
  useEffect(() => {
    if (!video) return;

    // 清理旧播放器
    if (playerRef.current) { try { playerRef.current.dispose(); } catch (_) {} playerRef.current = null; }
    if (playerContainerRef.current) playerContainerRef.current.innerHTML = '';

    let cancelled = false;

    const setLoadingState = (v: boolean) => { if (!cancelled) setLoading(v); };
    const setErrorState = (v: string | null) => { if (!cancelled) setError(v); };

    const initPlayer = async () => {
      setLoadingState(true);
      setErrorState(null);

      // 先检查离线状态，如果有缓存直接用原生播放器
      if (!navigator.onLine) {
        const cachedUrl = await findCachedVideo(video.videoId);
        if (cachedUrl) {
          console.log('[离线模式] 找到缓存:', cachedUrl);
          if (playerContainerRef.current && !cancelled) {
            createNativePlayer(playerContainerRef.current, cachedUrl, {
              onLoad: () => { setLoadingState(false); setErrorState(null); },
              onError: (msg) => { setErrorState(msg); setLoadingState(false); },
            });
          }
          return;
        }
        // 没有缓存，显示错误
        setErrorState('离线状态，该视频尚未缓存。请联网后先播放一次。');
        setLoadingState(false);
        return;
      }

      // ===== 在线模式 =====
      try {
        // 1. 加载播放器资源
        await loadPlayerAssets();
        if (cancelled) return;

        // 2. 挂载拦截器，捕获播放器请求的 mp4 URL
        const unhook = setupInterceptors(video.videoId);

        // 3. 获取 playauth
        const resp = await fetch(
          `${PLAYAUTH_API}?videoId=${encodeURIComponent(video.videoId)}`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (!resp.ok) throw new Error(`获取播放凭证失败: ${resp.status}`);
        const { playAuth } = await resp.json();
        if (!playAuth) throw new Error('播放凭证为空');
        if (cancelled) return;

        // 4. 初始化阿里云播放器
        if (!playerContainerRef.current || cancelled) return;

        playerRef.current = new window.Aliplayer({
          id: playerContainerRef.current.id,
          vid: video.videoId,
          playauth: playAuth,
          region: 'cn-shanghai',
          width: '100%',
          height: '100%',
          autoplay: true,
          playsinline: true,
          preload: true,
          controlBarVisibility: 'hover',
          useH5Prism: true,
          timeout: 15000,
          skinLayout: [
            { name: 'bigPlayButton', align: 'blabs', x: 30, y: 80 },
            { name: 'H5Loading', align: 'cc' },
            { name: 'errorDisplay', align: 'tlabs', x: 0, y: 0 },
            { name: 'infoDisplay' },
            { name: 'tooltip', align: 'blabs', x: 0, y: 56 },
            { name: 'thumbnail' },
            {
              name: 'controlBar', align: 'blabs', x: 0, y: 0,
              children: [
                { name: 'progress', align: 'blabs', x: 0, y: 44 },
                { name: 'playButton', align: 'tl', x: 15, y: 12 },
                { name: 'timeDisplay', align: 'tl', x: 10, y: 7 },
                { name: 'fullScreenButton', align: 'tr', x: 10, y: 12 },
                { name: 'setting', align: 'tr', x: 15, y: 12 },
                { name: 'volume', align: 'tr', x: 5, y: 10 },
              ],
            },
          ],
        });

        playerRef.current.on('ready', () => {
          if (!cancelled) { setLoadingState(false); retryCountRef.current = 0; setRetries(0); }
        });
        playerRef.current.on('playing', () => {
          if (!cancelled) { setLoadingState(false); setErrorState(null); retryCountRef.current = 0; setRetries(0); }
        });
        playerRef.current.on('error', () => {
          if (cancelled) return;
          unhook();
          if (retryCountRef.current < 3) {
            retryCountRef.current++;
            const count = retryCountRef.current;
            setRetries(count);
            try { playerRef.current?.dispose(); } catch (_) {}
            playerRef.current = null;
            setTimeout(() => {
              if (!cancelled && playerContainerRef.current) {
                playerContainerRef.current.innerHTML = '';
                initPlayer();
              }
            }, 2000 * count);
          } else {
            setErrorState('视频播放失败，请检查网络后刷新');
            setLoadingState(false);
          }
        });
      } catch (e: any) {
        if (cancelled) return;
        setErrorState(e.message || '加载失败，请刷新页面');
        setLoadingState(false);
      }
    };

    initPlayer();

    return () => {
      cancelled = true;
      if (playerRef.current) { try { playerRef.current.dispose(); } catch (_) {} playerRef.current = null; }
    };
  }, [video?.videoId]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
      if (e.key === 'ArrowRight' && nextIndex !== null) goToVideo(nextIndex, 'left');
      if (e.key === 'ArrowLeft' && prevIndex !== null) goToVideo(prevIndex, 'right');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, nextIndex, prevIndex]);

  const goToVideo = useCallback(
    (newIndex: number, direction: SwipeDirection) => {
      if (newIndex < 0 || !grade) return;
      setSwipeAnim(direction);
      setTimeout(() => {
        navigate(`/player/${gradeId}/${newIndex}`);
        setSwipeAnim('none');
      }, 150);
    },
    [grade, gradeId, navigate]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const absDeltaY = Math.abs(deltaY);
    const absDeltaX = Math.abs(deltaX);
    const threshold = 60;
    if (absDeltaY > threshold && absDeltaY > absDeltaX) {
      if (deltaY < 0 && prevIndex !== null) goToVideo(prevIndex, 'right');
      else if (deltaY > 0 && nextIndex !== null) goToVideo(nextIndex, 'left');
    }
  };

  if (!video || !grade) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted text-lg mb-4">视频不存在</p>
          <button onClick={() => navigate('/')} className="px-6 py-2.5 rounded-xl bg-accent text-dark-900 font-medium hover:bg-accent-light transition-colors">返回首页</button>
        </div>
      </div>
    );
  }

  const animClass = swipeAnim === 'left' ? 'slide-in-right' : swipeAnim === 'right' ? 'slide-in-left' : '';

  return (
    <div className={`fixed inset-0 z-50 bg-black flex flex-col ${animClass}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div id="aliplayer-container" ref={playerContainerRef} className="w-screen h-screen bg-black" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/50 text-sm">{retries > 0 ? `加载中（重试 ${retries}/3）...` : '加载中...'}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/80 text-white px-6 py-3 rounded-lg text-sm max-w-xs text-center pointer-events-none">
          <p className="font-medium mb-1">播放失败</p>
          <p className="text-white/70 text-xs break-all">{error}</p>
        </div>
      )}

      <div className="absolute top-3 left-3 z-40 pointer-events-none flex items-center gap-2">
        <h1 className="text-white/70 text-sm sm:text-base font-medium drop-shadow-lg max-w-[60vw] truncate">{video.title}</h1>
        {isOffline && <span className="text-yellow-400/70 text-xs bg-black/40 px-2 py-0.5 rounded-full">离线</span>}
      </div>

      <div className="absolute top-3 right-3 z-40">
        <ControlButton onClick={() => navigate('/')} label="首页">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
          <span>首页</span>
        </ControlButton>
      </div>

      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-10">
        {prevIndex !== null && (
          <ControlButton onClick={() => goToVideo(prevIndex, 'right')} label="上一课">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
            </svg>
            <span>上一课</span>
          </ControlButton>
        )}
        {nextIndex !== null && (
          <ControlButton onClick={() => goToVideo(nextIndex, 'left')} label="下一课">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="M5 12l7 7 7-7" />
            </svg>
            <span>下一课</span>
          </ControlButton>
        )}
      </div>
    </div>
  );
}

function ControlButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} title={label}
      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/50 active:scale-90 transition-all focus:outline-none whitespace-nowrap text-sm">
      {children}
    </button>
  );
}