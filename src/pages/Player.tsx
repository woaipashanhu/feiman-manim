import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideo, PLAYAUTH_API } from '../data/videos';

type SwipeDirection = 'none' | 'left' | 'right';

declare global {
  interface Window { Aliplayer: any }
}

const ALIPLAYER_BASE = '/feiman-manim/aliplayer';

// ====== 视频缓存映射管理 ======

const VIDEO_CACHE_MAP_KEY = 'video-url-cache';

/** 保存 videoId → mp4 URL 映射 */
function saveVideoUrlMapping(videoId: string, mp4Url: string) {
  try {
    const map = JSON.parse(localStorage.getItem(VIDEO_CACHE_MAP_KEY) || '{}');
    if (map[videoId] !== mp4Url) {
      map[videoId] = mp4Url;
      localStorage.setItem(VIDEO_CACHE_MAP_KEY, JSON.stringify(map));
      console.log(`[缓存映射] ${videoId} → ${mp4Url}`);
    }
  } catch { /* ignore */ }
}

/** 读取 videoId 对应的缓存 mp4 URL */
function getVideoUrlMapping(videoId: string): string | null {
  try {
    const map = JSON.parse(localStorage.getItem(VIDEO_CACHE_MAP_KEY) || '{}');
    return map[videoId] || null;
  } catch { return null; }
}

/** 检查 URL 是否在 SW 缓存中 */
async function isUrlCached(url: string): Promise<boolean> {
  if ('caches' in window) {
    try {
      const cache = await caches.open('cached-videos');
      const resp = await cache.match(url);
      return !!resp;
    } catch { /* ignore */ }
  }
  return false;
}

// ====== 请求拦截器：捕获播放器对 mp4 的请求 ======

/** 拦截 fetch，记录 mp4 URL */
function interceptFetch(activeVideoId: string) {
  const originalFetch = window.fetch;
  const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch.call(window, input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (/\.mp4(\?|$)/i.test(url) && activeVideoId) {
      try {
        const cleanUrl = new URL(url);
        saveVideoUrlMapping(activeVideoId, cleanUrl.origin + cleanUrl.pathname);
      } catch { /* ignore */ }
    }
    return response;
  };
  // @ts-ignore
  window.fetch = patchedFetch;
  return () => { window.fetch = originalFetch; };
}

/** 拦截 XMLHttpRequest，记录 mp4 URL */
function interceptXHR(activeVideoId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalOpen: any = XMLHttpRequest.prototype.open;
  const patchedOpen = function(this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
    const urlStr = typeof url === 'string' ? url : url.href;
    if (/\.mp4(\?|$)/i.test(urlStr) && activeVideoId) {
      try {
        const cleanUrl = new URL(urlStr);
        saveVideoUrlMapping(activeVideoId, cleanUrl.origin + cleanUrl.pathname);
      } catch { /* ignore */ }
    }
    return originalOpen.call(this, method, url, ...rest);
  };
  // @ts-ignore
  XMLHttpRequest.prototype.open = patchedOpen;
  return () => { XMLHttpRequest.prototype.open = originalOpen; };
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

function createNativePlayer(container: HTMLDivElement, url: string, callbacks: {
  onLoad: () => void;
  onError: (msg: string) => void;
}) {
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

    // 清理
    if (playerRef.current) { try { playerRef.current.dispose(); } catch (_) {} playerRef.current = null; }
    if (playerContainerRef.current) playerContainerRef.current.innerHTML = '';

    let cancelled = false;

    const setLoadingState = (v: boolean) => { if (!cancelled) setLoading(v); };
    const setErrorState = (v: string | null) => { if (!cancelled) setError(v); };

    const initPlayer = async () => {
      setLoadingState(true);
      setErrorState(null);

      try {
        // 1. 加载播放器资源
        await loadPlayerAssets();
        if (cancelled) return;

        // 2. 设置请求拦截，捕获 mp4 URL
        const unhookFetch = interceptFetch(video.videoId);
        const unhookXHR = interceptXHR(video.videoId);

        // 3. 获取 playauth
        const resp = await fetch(
          `${PLAYAUTH_API}?videoId=${encodeURIComponent(video.videoId)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        unhookFetch();
        unhookXHR();

        if (!resp.ok) throw new Error(`获取播放凭证失败: ${resp.status}`);
        const { playAuth } = await resp.json();
        if (!playAuth) throw new Error('播放凭证为空');
        if (cancelled) return;

        // 4. 重新挂载拦截器（播放器内部请求 mp4 在初始化后才发生）
        const unhookFetch2 = interceptFetch(video.videoId);
        const unhookXHR2 = interceptXHR(video.videoId);

        // 5. 初始化阿里云播放器
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
          if (retryCountRef.current < 3) {
            retryCountRef.current++;
            const count = retryCountRef.current;
            setRetries(count);
            try { playerRef.current?.dispose(); } catch (_) {}
            playerRef.current = null;
            unhookFetch2();
            unhookXHR2();
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

        // playauth 失败 → 尝试离线缓存播放
        const cachedUrl = getVideoUrlMapping(video.videoId);
        if (cachedUrl && await isUrlCached(cachedUrl)) {
          console.log('[离线模式] 使用缓存:', cachedUrl);
          if (playerContainerRef.current) {
            createNativePlayer(playerContainerRef.current, cachedUrl, {
              onLoad: () => { setLoadingState(false); setErrorState(null); },
              onError: (msg) => { setErrorState(msg); setLoadingState(false); },
            });
          }
        } else if (!navigator.onLine) {
          setErrorState('离线状态，该视频尚未缓存。请联网后先播放一次。');
          setLoadingState(false);
        } else {
          setErrorState(e.message || '加载失败，请刷新页面');
          setLoadingState(false);
        }
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