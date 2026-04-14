import { useNavigate } from 'react-router-dom';
import type { VideoItem } from '../data/videos';

interface VideoCardProps {
  video: VideoItem;
  gradeId: string;
  index: number;
}

export default function VideoCard({ video, gradeId, index }: VideoCardProps) {
  const navigate = useNavigate();
  const coverUrl = video.cover;

  return (
    <button
      className="card-glow w-full rounded-card overflow-hidden text-left bg-dark-700 focus:outline-none focus:ring-2 focus:ring-accent/50"
      onClick={() => navigate(`/player/${gradeId}/${index}`)}
    >
      {/* 缩略图区域 */}
      <div className="relative w-full aspect-video overflow-hidden bg-dark-600">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src =
                'data:image/svg+xml,' +
                encodeURIComponent(
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="none"><rect width="320" height="180" fill="#1a1a2e"/><circle cx="160" cy="80" r="30" stroke="#00d4aa" stroke-width="2"/><polygon points="152,68 152,92 176,80" fill="#00d4aa"/><text x="160" y="140" text-anchor="middle" fill="#a0a0b8" font-size="12" font-family="sans-serif">Video Preview</text></svg>'
                );
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-dark-600">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="#00d4aa" strokeWidth="1.5" opacity="0.5"/>
              <polygon points="20,14 20,34 36,24" fill="#00d4aa" opacity="0.7"/>
            </svg>
          </div>
        )}
        {/* 播放按钮叠加层 */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center shadow-lg shadow-accent/30">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 4L17 10L7 16V4Z" fill="white" />
            </svg>
          </div>
        </div>

      </div>
      {/* 标题区域 */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-white/90 line-clamp-1 leading-tight">
          {video.title}
        </h3>
      </div>
    </button>
  );
}