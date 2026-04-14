/**
 * 阿里云视频点播上传脚本
 * 用于将本地视频文件上传到阿里云视频点播服务
 * 
 * 使用方法：
 * node scripts/upload-to-aliyun.mjs
 */

import Vod from '@alicloud/vod20170321';
import * as $OpenApi from '@alicloud/openapi-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 阿里云账号配置
const ACCESS_KEY_ID = process.env.ALIYUN_AK || '';
const ACCESS_KEY_SECRET = process.env.ALIYUN_SK || '';
const REGION_ID = 'cn-shanghai';

// 视频文件夹路径
const VIDEO_FOLDER = process.argv[2] || process.env.VIDEO_FOLDER || '';

// 创建 VOD 客户端
function createVodClient() {
  const config = new $OpenApi.Config({
    accessKeyId: ACCESS_KEY_ID,
    accessKeySecret: ACCESS_KEY_SECRET,
  });
  // 点播服务的接入地址
  config.endpoint = `vod.${REGION_ID}.aliyuncs.com`;
  return new Vod(config);
}

// 获取上传地址和凭证
async function getUploadAuthAndAddress(client, title, fileName) {
  const request = new Vod.CreateUploadVideoRequest({
    title: title,
    fileName: fileName,
    // 不转码模板组
    templateGroupId: 'VOD_NO_TRANSCODE',
    // 存储区域
    storageLocation: `oss-${REGION_ID}`,
  });
  
  const response = await client.createUploadVideo(request);
  return {
    videoId: response.body.videoId,
    uploadAddress: response.body.uploadAddress,
    uploadAuth: response.body.uploadAuth,
    requestId: response.body.requestId,
  };
}

// Base64 解码
function base64Decode(str) {
  return Buffer.from(str, 'base64').toString('utf-8');
}

// 解析上传地址
function parseUploadAddress(uploadAddress) {
  const decoded = base64Decode(uploadAddress);
  return JSON.parse(decoded);
}

// 解析上传凭证
function parseUploadAuth(uploadAuth) {
  const decoded = base64Decode(uploadAuth);
  return JSON.parse(decoded);
}

// 使用 OSS 上传文件
async function uploadFileToOSS(filePath, uploadAddress, uploadAuth, onProgress) {
  const OSS = (await import('ali-oss')).default;
  
  const address = parseUploadAddress(uploadAddress);
  const auth = parseUploadAuth(uploadAuth);
  
  // 从 endpoint 提取 region，格式如: oss-cn-shanghai.aliyuncs.com
  const regionMatch = address.endpoint.match(/oss-([^.]+)/);
  const region = regionMatch ? `oss-${regionMatch[1]}` : 'oss-cn-shanghai';
  
  console.log(`  OSS 配置: region=${region}, bucket=${address.bucket}`);
  console.log(`  上传目标: ${address.object}`);
  
  const client = new OSS({
    region: region,
    accessKeyId: auth.accessKeyId,
    accessKeySecret: auth.accessKeySecret,
    stsToken: auth.securityToken,
    bucket: address.bucket,
    secure: true,
  });
  
  // 使用 put 方法上传文件，带进度回调
  const result = await client.put(address.object, filePath, {
    progress: onProgress,
  });
  
  return result;
}

// 上传单个视频
async function uploadVideo(client, filePath, title) {
  console.log(`\n开始上传: ${title}`);
  console.log(`  文件路径: ${filePath}`);
  
  // 获取文件大小
  const stat = fs.statSync(filePath);
  const fileSizeMB = (stat.size / 1024 / 1024).toFixed(2);
  console.log(`  文件大小: ${fileSizeMB} MB`);
  
  // 获取上传凭证
  console.log('  获取上传凭证...');
  const { videoId, uploadAddress, uploadAuth } = await getUploadAuthAndAddress(
    client, 
    title, 
    path.basename(filePath)
  );
  console.log(`  VideoID: ${videoId}`);
  
  // 上传文件到 OSS
  console.log('  上传文件到 OSS...');
  const startTime = Date.now();
  
  await uploadFileToOSS(filePath, uploadAddress, uploadAuth, (p) => {
    const percent = (p * 100).toFixed(1);
    process.stdout.write(`\r  上传进度: ${percent}%`);
  });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  上传完成! 耗时 ${elapsed}s`);
  
  return { videoId, title, filePath };
}

// 获取视频播放信息
async function getPlayInfo(client, videoId) {
  const request = new Vod.GetPlayInfoRequest({
    videoId: videoId,
  });
  const response = await client.getPlayInfo(request);
  return response.body;
}

// 获取视频列表
function getVideoFiles(folder) {
  const files = fs.readdirSync(folder);
  return files
    .filter(f => f.endsWith('.mp4'))
    .sort((a, b) => {
      // 按课程号排序
      const numA = parseInt(a.match(/第(\d+)课/)?.[1] || '0');
      const numB = parseInt(b.match(/第(\d+)课/)?.[1] || '0');
      return numA - numB;
    })
    .map(f => ({
      filePath: path.join(folder, f),
      title: f.replace('.mp4', '').replace('_1080p', ''),
      fileName: f,
    }));
}

// 主函数
async function main() {
  console.log('===========================================');
  console.log('阿里云视频点播批量上传工具');
  console.log('===========================================');
  console.log(`服务区域: ${REGION_ID}`);
  console.log(`视频文件夹: ${VIDEO_FOLDER}`);
  
  // 获取视频文件列表
  const videos = getVideoFiles(VIDEO_FOLDER);
  console.log(`\n找到 ${videos.length} 个视频文件:`);
  videos.forEach((v, i) => {
    const size = (fs.statSync(v.filePath).size / 1024 / 1024).toFixed(2);
    console.log(`  ${i + 1}. ${v.title} (${size} MB)`);
  });
  
  // 询问是否继续
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const answer = await new Promise(resolve => {
    rl.question('\n是否开始上传? (y/n): ', resolve);
  });
  rl.close();
  
  if (answer.toLowerCase() !== 'y') {
    console.log('已取消上传');
    return;
  }
  
  // 创建 VOD 客户端
  const client = createVodClient();
  
  // 上传结果
  const results = [];
  
  // 批量上传
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    console.log(`\n[${i + 1}/${videos.length}] 处理: ${video.title}`);
    
    try {
      const result = await uploadVideo(client, video.filePath, video.title);
      results.push(result);
      
      // 获取播放地址
      try {
        const playInfo = await getPlayInfo(client, result.videoId);
        if (playInfo.playInfoList && playInfo.playInfoList.length > 0) {
          const playUrl = playInfo.playInfoList[0].playURL;
          console.log(`  播放地址: ${playUrl}`);
          result.playUrl = playUrl;
        }
      } catch (e) {
        console.log(`  获取播放地址失败: ${e.message}`);
      }
      
    } catch (error) {
      console.error(`  上传失败: ${error.message}`);
      results.push({ ...video, error: error.message });
    }
    
    // 间隔 1 秒
    if (i < videos.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // 输出结果汇总
  console.log('\n===========================================');
  console.log('上传结果汇总');
  console.log('===========================================');
  
  results.forEach((r, i) => {
    if (r.videoId) {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   VideoID: ${r.videoId}`);
      if (r.playUrl) {
        console.log(`   播放地址: ${r.playUrl}`);
      }
    } else {
      console.log(`${i + 1}. ${r.title} - 失败: ${r.error}`);
    }
  });
  
  // 保存结果到 JSON 文件
  const outputPath = path.join(__dirname, 'upload-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n结果已保存到: ${outputPath}`);
}

main().catch(console.error);
