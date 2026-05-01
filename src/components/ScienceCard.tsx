import { useNavigate } from 'react-router-dom';
import type { ScienceScene } from '../data/science';

interface ScienceCardProps {
  scene: ScienceScene;
  index: number;
}

const categoryLabels: Record<string, string> = {
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  astronomy: '天文',
  earth: '地球科学',
  other: '其他',
};

export default function ScienceCard({ scene, index }: ScienceCardProps) {
  const navigate = useNavigate();

  return (
    <button
      className="card-glow w-full rounded-card overflow-hidden text-left bg-dark-700 focus:outline-none focus:ring-2 focus:ring-[#00d4aa]/50 fade-in-up"
      style={{ animationDelay: `${index * 80 + 100}ms`, opacity: 0 }}
      onClick={() => navigate(`/science/${scene.id}`)}
    >
      {/* 缩略图区域 */}
      <div className="relative w-full aspect-video overflow-hidden bg-dark-600">
        {scene.cover ? (
          <img
            src={`/${scene.cover}`}
            alt={scene.title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="#00d4aa" strokeWidth="1.5" opacity="0.4"/>
              <circle cx="24" cy="24" r="8" stroke="#00d4aa" strokeWidth="1" opacity="0.6"/>
              <line x1="24" y1="4" x2="24" y2="16" stroke="#00d4aa" strokeWidth="1" opacity="0.3"/>
              <line x1="24" y1="32" x2="24" y2="44" stroke="#00d4aa" strokeWidth="1" opacity="0.3"/>
              <line x1="4" y1="24" x2="16" y2="24" stroke="#00d4aa" strokeWidth="1" opacity="0.3"/>
              <line x1="32" y1="24" x2="44" y2="24" stroke="#00d4aa" strokeWidth="1" opacity="0.3"/>
            </svg>
          </div>
        )}

        {/* 3D 标识 */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#00d4aa]/15 backdrop-blur-sm">
          <span className="text-[10px] font-medium text-[#00d4aa]">3D 交互</span>
        </div>

        {/* 分类标签 */}
        {scene.category && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-white/10 backdrop-blur-sm">
            <span className="text-[10px] text-white/60">
              {categoryLabels[scene.category] || scene.category}
            </span>
          </div>
        )}

        {/* 悬停叠加层 */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-[#00d4aa]/20 backdrop-blur-sm flex items-center justify-center border border-[#00d4aa]/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" stroke="#00d4aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* 标题区域 */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-white/90 line-clamp-1 leading-tight">
          {scene.title}
        </h3>
        {scene.description && (
          <p className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed">
            {scene.description}
          </p>
        )}
      </div>
    </button>
  );
}
