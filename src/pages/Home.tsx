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

        {/* 网站简介（SEO友好） */}
        <p className="max-w-7xl mx-auto mt-3 text-sm text-white/40 leading-relaxed">
          用动画图形呈现数学思想，培养孩子的数学直观思维。覆盖小学一至六年级核心知识点。
        </p>

        {/* 标题下分隔线 */}
        <div className="max-w-7xl mx-auto mt-5">
          <div className="h-px bg-gradient-to-r from-[#00d4aa]/30 via-white/10 to-transparent" />
        </div>
      </header>

      {/* 年级分区列表 */}
      <main className="flex flex-col gap-10 max-w-7xl mx-auto mt-1">
        {grades.map((grade, index) => (
          <GradeSection key={grade.id} data={grade} sectionIndex={index} />
        ))}
      </main>

      {/* 底部信息 */}
      <footer className="mt-16 text-center px-4">
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto mb-4" />
        <p className="text-xs text-muted/50">
          刘费曼的数学课 · 用动画让数学变简单
        </p>
      </footer>

      {/* 右下角检查更新按钮 */}
      <button
        onClick={checkUpdate}
        disabled={updating}
        title="检查更新"
        className="fixed bottom-6 right-6 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-sm text-white/30 hover:text-white/80 hover:bg-white/10 active:scale-90 transition-all focus:outline-none disabled:opacity-50"
        aria-label="检查更新"
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

      {/* noscript 降级内容：搜索引擎爬虫和禁用JS的浏览器能看到的内容 */}
      <noscript>
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', color: '#333' }}>
          <h1>刘费曼的数学课</h1>
          <p>通过动画图形直观呈现数学思想，培养孩子的数学直觉与思维能力。覆盖小学一至六年级核心知识点，用图形而非文字讲解数学概念，让孩子真正理解数学背后的逻辑。</p>
          <h2>网站特色</h2>
          <p>全程动画图形演示，无文字无数字，用球、框、箭头等图形元素呈现数学概念。帮助孩子建立数学直观思维，而非死记硬背公式。</p>
          <h2>一年级课程列表</h2>
          <ul>
            <li>第1课 以5为基准的数键入门</li>
            <li>第2课 数的灵活拆分</li>
            <li>第3课 加1数感建立</li>
            <li>第4课 6的组成探索</li>
            <li>第5课 7的组成探索</li>
            <li>第6课 8的组成探索</li>
            <li>第7课 9的组成探索</li>
            <li>第8课 10的组成探索</li>
            <li>第9课 加法场景建模</li>
            <li>第10课 加法算式建模</li>
            <li>第11课 求加法中的未知加数</li>
            <li>第12课 加法算式与故事互转</li>
            <li>第13课 接着数</li>
            <li>第14课 加法等式概念建立</li>
            <li>第15课 加法交换律</li>
            <li>第16课 凑十法基础</li>
            <li>第17课 加法表梳理与规律探索</li>
            <li>第18课 加法关联事实梳理</li>
            <li>第19课 减法基础_求剩余问题</li>
            <li>第20课 减法进阶_求部分数问题</li>
            <li>第21课 减法策略减0和减1</li>
            <li>第22课 减法策略减相同数和减到剩1</li>
            <li>第23课 减法策略减5</li>
            <li>第24课 10的减法运算</li>
            <li>第25课 9的减法运算</li>
            <li>第26课 加减法关联与事实家族</li>
          </ul>
          <p>更多年级课程持续更新中，请启用 JavaScript 以获取最佳浏览体验。</p>
        </div>
      </noscript>
</div>
  );
}
