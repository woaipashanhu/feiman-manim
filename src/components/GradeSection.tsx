import type { GradeSection as GradeSectionType } from '../data/videos';
import VideoCard from './VideoCard';

interface GradeSectionProps {
  data: GradeSectionType;
  sectionIndex: number;
}

export default function GradeSection({ data, sectionIndex }: GradeSectionProps) {
  return (
    <section
      className="fade-in-up"
      style={{ animationDelay: `${sectionIndex * 100 + 200}ms`, opacity: 0 }}
    >
      {/* 标题行 */}
      <div className="px-4 sm:px-6 lg:px-8 mb-4">
        <div className="flex items-center gap-2.5">
          {/* 色块装饰 */}
          <div className="w-1 h-5 rounded-full bg-[#00d4aa]/70" />
          <h2 className="text-xl sm:text-2xl font-display text-white/95">
            {data.name}
          </h2>
        </div>
      </div>

      {/* 视频卡片网格 - 每行3个，自动换行 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 sm:px-6 lg:px-8">
        {data.videos.map((video, index) => (
          <VideoCard
            key={`${data.id}-${index}`}
            video={video}
            gradeId={data.id}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
