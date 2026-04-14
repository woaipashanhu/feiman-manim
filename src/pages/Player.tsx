import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideo, PLAYAUTH_API } from '../data/videos';

type SwipeDirection = 'none' | 'left' | 'right';

// 阿里云播放器类型声明
declare global {
  interface Window {
    Aliplayer: any;
  }
}

/** 带重试的 fetch */
async function fetchWithRetry(url: string, retries = 3, delay = 2000): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp;
      if (i === retries) return resp;
    } catch {
      if (i === retries) throw new Error('网络请求失败，请检查网络');
    }
    if (i < retries) await new Promise(r => setTimeout(r, delay * (i + 1)));
  }
  throw new Error('请求失败');
}

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

  // 加载阿里云播放器 JS/CSS
  useEffect(() => {
    if (window.Aliplayer) return;

    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });

    const loadCSS = (href: string): Promise<void> =>
      new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        document.head.appendChild(link);
      });

    Promise.all([
      loadCSS('https://g.alicdn.com/de/prismplayer/2.16.3/skins/default/aliplayer-min.css'),
      loadScript('https://g.alicdn.com/de/prismplayer/2.16.3/aliplayer-min.js'),
    ]).catch((e) => console.error('阿里云播放器加载失败:', e));
  }, []);

  // 获取 playauth 并初始化播放器
  useEffect(() => {
    if (!video) return;

    // 销毁旧播放器
    if (playerRef.current) {
      try { playerRef.current.dispose(); } catch (_) {}
      playerRef.current = null;
    }

    // 清空容器
    if (playerContainerRef.current) {
      playerContainerRef.current.innerHTML = '';
    }

    let cancelled = false;

    const initPlayer = async () => {
      setLoading(true);
      setError(null);

      try {
        // 从后端获取 playauth（带重试）
        const resp = await fetchWithRetry(
          `${PLAYAUTH_API}?videoId=${encodeURIComponent(video.videoId)}`
        );
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`获取播放凭证失败: ${resp.status} ${errText}`);
        }
        const { playAuth } = await resp.json();

        if (cancelled) return;

        // 等待阿里云播放器加载
        let waitCount = 0;
        while (!window.Aliplayer && waitCount < 50) {
          await new Promise((r) => setTimeout(r, 100));
          waitCount++;
        }
        if (!window.Aliplayer) {
          throw new Error('播放器加载超时，请刷新页面重试');
        }

        if (cancelled || !playerContainerRef.current) return;

        // 初始化阿里云播放器
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
              name: 'controlBar',
              align: 'blabs',
              x: 0,
              y: 0,
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

        // 播放器事件
        playerRef.current.on('ready', () => {
          if (!cancelled) { setLoading(false); retryCountRef.current = 0; setRetries(0); }
        });
        playerRef.current.on('playing', () => {
          if (!cancelled) { setLoading(false); setError(null); retryCountRef.current = 0; setRetries(0); }
        });
        playerRef.current.on('error', (e: any) => {
          console.error('播放器错误:', e);
          if (cancelled) return;

          // 自动重试，最多3次
          if (retryCountRef.current < 3) {
            retryCountRef.current++;
            const count = retryCountRef.current;
            setRetries(count);
            console.log(`播放器错误，自动重试 (${count}/3)...`);

            // 销毁当前播放器并重新初始化
            try { playerRef.current?.dispose(); } catch (_) {}
            playerRef.current = null;

            setTimeout(() => {
              if (!cancelled && playerContainerRef.current) {
                playerContainerRef.current.innerHTML = '';
                initPlayer();
              }
            }, 2000 * count); // 递增延迟
          } else {
            setError('视频播放失败，请检查网络后刷新');
            setLoading(false);
          }
        });
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || '加载失败，请刷新页面');
          setLoading(false);
        }
      }
    };

    initPlayer();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try { playerRef.current.dispose(); } catch (_) {}
        playerRef.current = null;
      }
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

  // 切换视频
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

  // 触摸事件
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
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-xl bg-accent text-dark-900 font-medium hover:bg-accent-light transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const animClass =
    swipeAnim === 'left' ? 'slide-in-right' : swipeAnim === 'right' ? 'slide-in-left' : '';

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex flex-col ${animClass}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 阿里云播放器容器 */}
      <div
        id="aliplayer-container"
        ref={playerContainerRef}
        className="w-screen h-screen bg-black"
      />

      {/* 加载中 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/50 text-sm">
              {retries > 0 ? `加载中（重试 ${retries}/3）...` : '加载中...'}
            </p>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/80 text-white px-6 py-3 rounded-lg text-sm max-w-xs text-center pointer-events-none">
          <p className="font-medium mb-1">播放失败</p>
          <p className="text-white/70 text-xs break-all">{error}</p>
        </div>
      )}

      {/* 左上角标题 */}
      <div className="absolute top-3 left-3 z-40 pointer-events-none">
        <h1 className="text-white/70 text-sm sm:text-base font-medium drop-shadow-lg max-w-[60vw] truncate">
          {video.title}
        </h1>
      </div>

      {/* 右上角首页按钮 */}
      <div className="absolute top-3 right-3 z-40">
        <ControlButton onClick={() => navigate('/')} label="首页">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
            <path d="M9 21V12h6v9"/>
          </svg>
          <span>首页</span>
        </ControlButton>
      </div>

      {/* 右侧中间：上/下箭头 */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-10">
        {prevIndex !== null && (
          <ControlButton onClick={() => goToVideo(prevIndex, 'right')} label="上一课">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5"/>
              <path d="M5 12l7-7 7 7"/>
            </svg>
            <span>上一课</span>
          </ControlButton>
        )}

        {nextIndex !== null && (
          <ControlButton onClick={() => goToVideo(nextIndex, 'left')} label="下一课">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14"/>
              <path d="M5 12l7 7 7-7"/>
            </svg>
            <span>下一课</span>
          </ControlButton>
        )}
      </div>
    </div>
  );
}

/** 半透明圆角矩形按钮 */
function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/50 active:scale-90 transition-all focus:outline-none whitespace-nowrap text-sm"
    >
      {children}
    </button>
  );
}