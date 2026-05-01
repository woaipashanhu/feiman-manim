import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getScienceScene, scienceScenes } from '../data/science';

export default function ScienceViewer() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const { scene, index, prevIndex, nextIndex } = getScienceScene(sceneId || '');

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !scene) return;

    const onLoad = () => setLoading(false);
    iframe.addEventListener('load', onLoad);
    const timer = setTimeout(() => setLoading(false), 8000);
    return () => {
      iframe.removeEventListener('load', onLoad);
      clearTimeout(timer);
    };
  }, [scene]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  if (!scene) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-6xl mb-4 opacity-30">&#128300;</div>
          <h2 className="text-xl text-white/70 mb-2">场景未找到</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 rounded-full bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all text-sm"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const prevScene = prevIndex !== null ? scienceScenes[prevIndex] : null;
  const nextScene = nextIndex !== null ? scienceScenes[nextIndex] : null;

  return (
    <div className={`min-h-screen bg-[#050508] flex flex-col ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {!fullscreen && (
        <header className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              title="返回首页"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-medium text-white/90 truncate">{scene.title}</h1>
              {scene.description && (
                <p className="text-xs text-white/40 truncate">{scene.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {prevScene && (
              <button
                onClick={() => navigate(`/science/${prevScene.id}`)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                title={prevScene.title}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>
            )}
            <span className="text-xs text-white/30 px-2">{index + 1} / {scienceScenes.length}</span>
            {nextScene && (
              <button
                onClick={() => navigate(`/science/${nextScene.id}`)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                title={nextScene.title}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button
              onClick={() => setFullscreen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              title="全屏"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {fullscreen && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/60 to-transparent">
          <h1 className="text-sm text-white/70">{scene.title}</h1>
          <button
            onClick={() => setFullscreen(false)}
            className="px-3 py-1 text-xs text-white/50 hover:text-white/80 rounded bg-white/5 hover:bg-white/10 transition-all"
          >
            退出全屏 (Esc)
          </button>
        </div>
      )}

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050508] z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-[#00d4aa]/20 border-t-[#00d4aa] rounded-full animate-spin" />
              <span className="text-xs text-white/30">加载 3D 场景中...</span>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={`/${scene.file}`}
          className="w-full h-full border-0"
          style={{ minHeight: fullscreen ? '100vh' : 'calc(100vh - 52px)' }}
          allow="accelerometer; gyroscope"
          title={scene.title}
        />
      </div>

      {!fullscreen && scienceScenes.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 bg-black/40 border-t border-white/5">
          {prevScene && (
            <button
              onClick={() => navigate(`/science/${prevScene.id}`)}
              className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 rounded bg-white/5 hover:bg-white/10 transition-all"
            >
              &#8592; {prevScene.title}
            </button>
          )}
          <div className="flex gap-1">
            {scienceScenes.map((s, i) => (
              <div
                key={s.id}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-[#00d4aa]' : 'bg-white/15'}`}
              />
            ))}
          </div>
          {nextScene && (
            <button
              onClick={() => navigate(`/science/${nextScene.id}`)}
              className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 rounded bg-white/5 hover:bg-white/10 transition-all"
            >
              {nextScene.title} &#8594;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
