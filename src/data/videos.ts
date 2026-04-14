// 视频数据配置
// 使用阿里云点播（VOD）+ HLS 私有加密 + playauth 鉴权播放

export const VOD_REGION = 'cn-shanghai';
export const PLAYAUTH_API = 'https://playauth-heildokxna.cn-shanghai.fcapp.run';

export interface VideoItem {
  title: string;
  videoId: string;    // 阿里云点播视频ID
  cover?: string;     // 封面图URL
}

export interface GradeSection {
  id: string;
  name: string;
  videos: VideoItem[];
}

export const grades: GradeSection[] = [
  {
    id: 'grade1',
    name: '一年级',
    videos: [
      { title: '第1课 以5为基准的数键入门', videoId: '902be27837e671f180fd6733a68f0102', cover: 'covers/902be27837e671f180fd6733a68f0102.jpg' },
      { title: '第2课 数的灵活拆分', videoId: '8072d58537e671f19e2d6633b79f0102', cover: 'covers/8072d58537e671f19e2d6633b79f0102.jpg' },
      { title: '第3课 加1数感建立', videoId: '10be7a8737e671f180966723b78e0102', cover: 'covers/10be7a8737e671f180966723b78e0102.jpg' },
      { title: '第4课 6的组成探索', videoId: 'e0e1168937e671f180e14531948c0102', cover: 'covers/e0e1168937e671f180e14531948c0102.jpg' },
      { title: '第5课 7的组成探索', videoId: '30ebac8a37e671f1b2815420848d0102', cover: 'covers/30ebac8a37e671f1b2815420848d0102.jpg' },
      { title: '第6课 8的组成探索', videoId: 'a01d5e8c37e671f180b96732b68f0102', cover: 'covers/a01d5e8c37e671f180b96732b68f0102.jpg' },
      { title: '第7课 9的组成探索', videoId: '208e208e37e671f18d8c4531959c0102', cover: 'covers/208e208e37e671f18d8c4531959c0102.jpg' },
      { title: '第8课 10的组成探索', videoId: '609fe04537f571f180fb5017f0f90102', cover: 'covers/609fe04537f571f180fb5017f0f90102.jpg' },
      { title: '第9课 加法场景建模', videoId: '3096a59137e671f199a15017f1e90102', cover: 'covers/3096a59137e671f199a15017f1e90102.jpg' },
      { title: '第10课 加法算式建模', videoId: '40b97e6737e671f180f54531958c0102', cover: 'covers/40b97e6737e671f180f54531958c0102.jpg' },
      { title: '第11课 求加法中的未知加数', videoId: 'd0fd396937e671f180fa5017e1e90102', cover: 'covers/d0fd396937e671f180fa5017e1e90102.jpg' },
      { title: '第12课 加法算式与故事互转', videoId: 'c0a4e26a37e671f1b2815420848d0102', cover: 'covers/c0a4e26a37e671f1b2815420848d0102.jpg' },
      { title: '第13课 接着数', videoId: 'e06d846c37e671f187905017f0e90102', cover: 'covers/e06d846c37e671f187905017f0e90102.jpg' },
      { title: '第14课 加法等式概念建立', videoId: 'b0fb386e37e671f1807f6732b68e0102', cover: 'covers/b0fb386e37e671f1807f6732b68e0102.jpg' },
      { title: '第15课 加法交换律', videoId: '6062257037e671f180f25420848c0102', cover: 'covers/6062257037e671f180f25420848c0102.jpg' },
      { title: '第16课 凑十法基础', videoId: 'c04fdb7137e671f180f25420848c0102', cover: 'covers/c04fdb7137e671f180f25420848c0102.jpg' },
      { title: '第17课 加法表梳理与规律探索', videoId: '30dc7d7337e671f180b95017f1e80102', cover: 'covers/30dc7d7337e671f180b95017f1e80102.jpg' },
      { title: '第18课 加法关联事实梳理', videoId: 'e02b597537e671f1807f6732b68e0102', cover: 'covers/e02b597537e671f1807f6732b68e0102.jpg' },
      { title: '第19课 减法基础_求剩余问题', videoId: 'd06a3c7737e671f180b96732b68f0102', cover: 'covers/d06a3c7737e671f180b96732b68f0102.jpg' },
      { title: '第20课 减法进阶_求部分数问题', videoId: '90c47e7a37e671f187905017f0e90102', cover: 'covers/90c47e7a37e671f187905017f0e90102.jpg' },
      { title: '第21课 减法策略减0和减1', videoId: '50492e7c37e671f19e2d6633b79f0102', cover: 'covers/50492e7c37e671f19e2d6633b79f0102.jpg' },
      { title: '第22课 减法策略减相同数和减到剩1', videoId: 'c0f3cb7d37e671f187905017f0e90102', cover: 'covers/c0f3cb7d37e671f187905017f0e90102.jpg' },
      { title: '第23课 减法策略减5', videoId: 'f0f1417f37e671f180f35017f1f80102', cover: 'covers/f0f1417f37e671f180f35017f1f80102.jpg' },
      { title: '第24课 10的减法运算', videoId: '009bcd8037e671f180b96732b68f0102', cover: 'covers/009bcd8037e671f180b96732b68f0102.jpg' },
      { title: '第25课 9的减法运算', videoId: '10ae718237e671f194166733a78e0102', cover: 'covers/10ae718237e671f194166733a78e0102.jpg' },
      { title: '第26课 加减法关联与事实家族', videoId: '003e098437e671f180f35017f1f80102', cover: 'covers/003e098437e671f180f35017f1f80102.jpg' },
    ],
  },
];

/** 根据 gradeId 和 videoIndex 查找视频及上/下课索引 */
export function getVideo(gradeId: string, videoIndex: number) {
  const grade = grades.find((g) => g.id === gradeId);
  if (!grade) return { video: null, grade: null, prevIndex: null, nextIndex: null };

  const video = grade.videos[videoIndex] ?? null;
  const prevIndex = videoIndex > 0 ? videoIndex - 1 : null;
  const nextIndex = videoIndex < grade.videos.length - 1 ? videoIndex + 1 : null;

  return { video, grade, prevIndex, nextIndex };
}