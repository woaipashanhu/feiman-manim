import ScienceCard from '../components/ScienceCard';
import { scienceScenes } from '../data/science';

export default function ScienceSection() {
  if (scienceScenes.length === 0) {
    return (
      <section className="fade-in-up" aria-label="科学可视化">
        <div className="px-4 sm:px-6 lg:px-8 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-[#00d4aa]/70" aria-hidden="true" />
            <h2 className="text-xl sm:text-2xl font-display text-white/95">
              科学可视化
            </h2>
            <span className="text-xs text-[#00d4aa]/60 ml-2">3D 交互实验</span>
          </div>
          <p className="text-xs text-white/30 mt-2 ml-3.5">
            即将上线，敬请期待
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="fade-in-up" aria-label="科学可视化">
      {/* 标题行 */}
      <div className="px-4 sm:px-6 lg:px-8 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 rounded-full bg-[#00d4aa]/70" aria-hidden="true" />
          <h2 className="text-xl sm:text-2xl font-display text-white/95">
            科学可视化
          </h2>
          <span className="text-xs text-[#00d4aa]/60 ml-2">3D 交互实验</span>
        </div>
      </div>

      {/* 场景卡片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 sm:px-6 lg:px-8">
        {scienceScenes.map((scene, index) => (
          <ScienceCard
            key={scene.id}
            scene={scene}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
