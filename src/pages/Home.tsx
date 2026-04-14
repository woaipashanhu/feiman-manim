import { useState } from 'react';
import { grades } from '../data/videos';
import GradeSection from '../components/GradeSection';

export default function Home() {
  const [updating, setUpdating] = useState(false);

  const checkUpdate = async () => {
    setUpdating(true);
    try {
      await (window as any).__checkForUpdate();
    } finally {
      // 如果页面没自动刷新，2秒后恢复按钮状态
      setTimeout(() => setUpdating(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-mesh pb-12">
      {/* 顶部导航栏 */}
      <header className="pt-8 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo 文字 */}
            <span className="text-3xl font-mono tracking-[0.25em] text-[#00d4aa] font-semibold">
              manim
            </span>

            {/* 分隔 */}
            <div className="w-px h-7 bg-white/20" />

            {/* 网站标题 */}
            <h1 className="text-2xl sm:text-3xl font-display text-white/90 tracking-wide">
              刘费曼的数学课
            </h1>
          </div>


        </div>

        {/* 标题下分隔线 */}
        <div className="max-w-7xl mx-auto mt-5">
          <div className="h-px bg-gradient-to-r from-[#00d4aa]/30 via-white/10 to-transparent" />
        </div>
      </header>

      {/* 年级分区列表 */}
      <div className="flex flex-col gap-10 max-w-7xl mx-auto mt-1">
        {grades.map((grade, index) => (
          <GradeSection key={grade.id} data={grade} sectionIndex={index} />
        ))}
      </div>

      {/* 底部信息 */}
      <footer className="mt-16 text-center px-4">
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto mb-4" />
        <p className="text-xs text-muted/50">
          Powered by Manim &middot; Built with React
        </p>
      </footer>
    
      {/* 右下角检查更新按钮 */}
      <button
        onClick={checkUpdate}
        disabled={updating}
        title="检查更新"
        className="fixed bottom-6 right-6 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-sm text-white/30 hover:text-white/80 hover:bg-white/10 active:scale-90 transition-all focus:outline-none disabled:opacity-50"
      >
        {updating ? (
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 105.64-11.36L1 10"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 105.64-11.36L1 10"/>
          </svg>
        )}
      </button>
</div>
  );
}