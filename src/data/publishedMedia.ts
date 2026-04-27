export type PublishedVideoAsset = {
  bvid: string;
  url: string;
  embedUrl: string;
};

const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1"]);

export const PUBLISHED_PORTFOLIO_VIDEOS: Record<string, PublishedVideoAsset> = {
  "/portfolio/experimental/异世界/video_cleaned.mp4": { bvid: "BV1KNo6BhEA4", url: "https://www.bilibili.com/video/BV1KNo6BhEA4", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1KNo6BhEA4&page=1" },
  "/portfolio/experimental/异世界/Video 1.mp4": { bvid: "BV1NNo6BhEC7", url: "https://www.bilibili.com/video/BV1NNo6BhEC7", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1NNo6BhEC7&page=1" },
  "/portfolio/experimental/异世界/video (1)_cleaned.mp4": { bvid: "BV1mwo6BYEg2", url: "https://www.bilibili.com/video/BV1mwo6BYEg2", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1mwo6BYEg2&page=1" },
  "/portfolio/experimental/异世界/Motorcycle_crashes_into_202604261650_cleaned.mp4": { bvid: "BV13eo6BrEMr", url: "https://www.bilibili.com/video/BV13eo6BrEMr", embedUrl: "https://player.bilibili.com/player.html?bvid=BV13eo6BrEMr&page=1" },
  "/portfolio/experimental/异世界/山河让路_无字版.MP4": { bvid: "BV1Deo6B6E9t", url: "https://www.bilibili.com/video/BV1Deo6B6E9t", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1Deo6B6E9t&page=1" },
  "/portfolio/experimental/情绪/Woman_floating_on_202604202025_cleaned.MP4": { bvid: "BV1XYo6B3Eue", url: "https://www.bilibili.com/video/BV1XYo6B3Eue", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1XYo6B3Eue&page=1" },
  "/portfolio/experimental/情绪/video (6)_cleaned.mp4": { bvid: "BV1U6o6BiEkw", url: "https://www.bilibili.com/video/BV1U6o6BiEkw", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1U6o6BiEkw&page=1" },
  "/portfolio/experimental/情绪/Legs_walking_on_202604211921_cleaned.MP4": { bvid: "BV1M6o6BqE99", url: "https://www.bilibili.com/video/BV1M6o6BqE99", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1M6o6BqE99&page=1" },
  "/portfolio/experimental/情绪/视频生成：翻书的丁达尔效应_cleaned.mp4": { bvid: "BV1mko6BNE7g", url: "https://www.bilibili.com/video/BV1mko6BNE7g", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1mko6BNE7g&page=1" },
  "/portfolio/experimental/情绪/07cdfe5b2b7f4d969a5a5e3da4cc10bc_cleaned.MOV": { bvid: "BV1uzo6BMEXc", url: "https://www.bilibili.com/video/BV1uzo6BMEXc", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1uzo6BMEXc&page=1" },
  "/portfolio/experimental/次元壁/video (3)_cleaned.mp4": { bvid: "BV1Uzo6BTEhm", url: "https://www.bilibili.com/video/BV1Uzo6BTEhm", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1Uzo6BTEhm&page=1" },
  "/portfolio/experimental/次元壁/Camera_moves_through_202604210031_cleaned.mp4": { bvid: "BV18zo6BMENb", url: "https://www.bilibili.com/video/BV18zo6BMENb", embedUrl: "https://player.bilibili.com/player.html?bvid=BV18zo6BMENb&page=1" },
  "/portfolio/experimental/次元壁/a41be5dec53a4a808e2212ae5cf0f33e.MOV": { bvid: "BV1wXo6BbECD", url: "https://www.bilibili.com/video/BV1wXo6BbECD", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1wXo6BbECD&page=1" },
  "/portfolio/experimental/次元壁/手绘风格女孩读信视频生成_cleaned.mp4": { bvid: "BV1kXo6BtEaU", url: "https://www.bilibili.com/video/BV1kXo6BtEaU", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1kXo6BtEaU&page=1" },
  "/portfolio/experimental/次元壁/精确首帧生成视频_cleaned.mp4": { bvid: "BV1kXo6BtEYf", url: "https://www.bilibili.com/video/BV1kXo6BtEYf", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1kXo6BtEYf&page=1" },
  "/portfolio/experimental/次元壁/07cdfe5b2b7f4d969a5a5e3da4cc10bc_cleaned.MOV": { bvid: "BV1r9o6BoE6b", url: "https://www.bilibili.com/video/BV1r9o6BoE6b", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1r9o6BoE6b&page=1" },
  "/portfolio/experimental/杂/video (4)_cleaned.mp4": { bvid: "BV1r5o6BsEYx", url: "https://www.bilibili.com/video/BV1r5o6BsEYx", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1r5o6BsEYx&page=1" },
  "/portfolio/experimental/杂/video (2)_cleaned.mp4": { bvid: "BV1c5o6BsEa8", url: "https://www.bilibili.com/video/BV1c5o6BsEa8", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1c5o6BsEa8&page=1" },
  "/portfolio/experimental/杂/Man_vanishing_into_202604202143_cleaned.MP4": { bvid: "BV18ZozBKEcq", url: "https://www.bilibili.com/video/BV18ZozBKEcq", embedUrl: "https://player.bilibili.com/player.html?bvid=BV18ZozBKEcq&page=1" },
  "/portfolio/experimental/杂/ff47e8943e1c446f99531c1fc928de09.MOV": { bvid: "BV1uZozBKEu4", url: "https://www.bilibili.com/video/BV1uZozBKEu4", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1uZozBKEu4&page=1" },
  "/portfolio/experimental/杂/CRT_computer_screen_202604201850_cleaned_cleaned.mp4": { bvid: "BV1UfozBvEqG", url: "https://www.bilibili.com/video/BV1UfozBvEqG", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1UfozBvEqG&page=1" },
  "/portfolio/experimental/杂/Crowd_digitized_into_202604202222_cleaned.MP4": { bvid: "BV18dozBqE6L", url: "https://www.bilibili.com/video/BV18dozBqE6L", embedUrl: "https://player.bilibili.com/player.html?bvid=BV18dozBqE6L&page=1" },
  "/portfolio/mthayas/Video 11.mp4": { bvid: "BV1iCozB1E4Y", url: "https://www.bilibili.com/video/BV1iCozB1E4Y", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1iCozB1E4Y&page=1" },
  "/portfolio/mthayas/Video 12.mp4": { bvid: "BV19aokBSEYR", url: "https://www.bilibili.com/video/BV19aokBSEYR", embedUrl: "https://player.bilibili.com/player.html?bvid=BV19aokBSEYR&page=1" },
  "/portfolio/mthayas/Video 13.mp4": { bvid: "BV1RaokBSENZ", url: "https://www.bilibili.com/video/BV1RaokBSENZ", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1RaokBSENZ&page=1" },
  "/portfolio/mthayas/Video 15.mp4": { bvid: "BV15aokBDEi5", url: "https://www.bilibili.com/video/BV15aokBDEi5", embedUrl: "https://player.bilibili.com/player.html?bvid=BV15aokBDEi5&page=1" },
  "/portfolio/mthayas/Video 17.mp4": { bvid: "BV1dtokBpECJ", url: "https://www.bilibili.com/video/BV1dtokBpECJ", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1dtokBpECJ&page=1" },
  "/portfolio/mthayas/Video 18.mp4": { bvid: "BV1dtokBpEdS", url: "https://www.bilibili.com/video/BV1dtokBpEdS", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1dtokBpEdS&page=1" },
  "/portfolio/mthayas/Video 19.mp4": { bvid: "BV1dtokBpEZx", url: "https://www.bilibili.com/video/BV1dtokBpEZx", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1dtokBpEZx&page=1" },
  "/portfolio/mthayas/Video 21.mp4": { bvid: "BV1otokBpExV", url: "https://www.bilibili.com/video/BV1otokBpExV", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1otokBpExV&page=1" },
  "/portfolio/mthayas/Video 22.mp4": { bvid: "BV1jtokBWEGz", url: "https://www.bilibili.com/video/BV1jtokBWEGz", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1jtokBWEGz&page=1" },
  "/portfolio/mthayas/Video 23.mp4": { bvid: "BV1jtokBWEGU", url: "https://www.bilibili.com/video/BV1jtokBWEGU", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1jtokBWEGU&page=1" },
  "/portfolio/mthayas/Video 24.mp4": { bvid: "BV1otokBWEgQ", url: "https://www.bilibili.com/video/BV1otokBWEgQ", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1otokBWEgQ&page=1" },
  "/portfolio/mthayas/Video 25.mp4": { bvid: "BV1dtokBpER5", url: "https://www.bilibili.com/video/BV1dtokBpER5", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1dtokBpER5&page=1" },
  "/portfolio/mthayas/Video 26.mp4": { bvid: "BV1ibokBXEny", url: "https://www.bilibili.com/video/BV1ibokBXEny", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1ibokBXEny&page=1" },
  "/portfolio/mthayas/Video 27.mp4": { bvid: "BV1Auo6BZEhC", url: "https://www.bilibili.com/video/BV1Auo6BZEhC", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1Auo6BZEhC&page=1" },
  "/portfolio/mthayas/Video 5.mp4": { bvid: "BV1f7o6BHEdr", url: "https://www.bilibili.com/video/BV1f7o6BHEdr", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1f7o6BHEdr&page=1" },
  "/portfolio/mthayas/Video 6.mp4": { bvid: "BV19aokBSEob", url: "https://www.bilibili.com/video/BV19aokBSEob", embedUrl: "https://player.bilibili.com/player.html?bvid=BV19aokBSEob&page=1" },
  "/portfolio/mthayas/Video 9.mp4": { bvid: "BV19aokBSEeY", url: "https://www.bilibili.com/video/BV19aokBSEeY", embedUrl: "https://player.bilibili.com/player.html?bvid=BV19aokBSEeY&page=1" },
  "/portfolio/mthayas/成片.mp4": { bvid: "BV1izoqB6E5T", url: "https://www.bilibili.com/video/BV1izoqB6E5T", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1izoqB6E5T&page=1" },
  "/portfolio/kuang/礦-饰品宣发片/成片3版.mp4": { bvid: "BV13SdkBLEmM", url: "https://www.bilibili.com/video/BV13SdkBLEmM", embedUrl: "https://player.bilibili.com/player.html?bvid=BV13SdkBLEmM&page=1" },
  "/portfolio/redtail/赤尾广告2版.mp4": { bvid: "BV1dHdCBpEUe", url: "https://www.bilibili.com/video/BV1dHdCBpEUe", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1dHdCBpEUe&page=1" },
  "/portfolio/starship/starship-pov.mp4": { bvid: "BV1GmdkB2Eto", url: "https://www.bilibili.com/video/BV1GmdkB2Eto", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1GmdkB2Eto&page=1" },
  "/portfolio/kling/kling-film.mp4": { bvid: "BV1kMdCBwERw", url: "https://www.bilibili.com/video/BV1kMdCBwERw", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1kMdCBwERw&page=1" },
  "/portfolio/march-28/march-28.mp4": { bvid: "BV1ZjdCBdEqG", url: "https://www.bilibili.com/video/BV1ZjdCBdEqG", embedUrl: "https://player.bilibili.com/player.html?bvid=BV1ZjdCBdEqG&page=1" },
};

const DEPLOYABLE_PORTFOLIO_ASSETS: Record<string, string> = {
  "/portfolio/kuang/礦-饰品宣发片/Carbon_Silk.mp3": "/portfolio-live/kuang/Carbon_Silk.mp3",
  "/portfolio/kuang/礦品牌设计/礦·Kuang 品牌理念体系.html": "/portfolio-live/kuang/kuang-brand-manifesto.html",
};

export const shouldUseLocalPortfolioAssets = () =>
  typeof window !== "undefined" && LOCAL_PREVIEW_HOSTS.has(window.location.hostname);

export const getPublishedPortfolioVideo = (src: string) => PUBLISHED_PORTFOLIO_VIDEOS[src];

export const isPublishedPortfolioVideo = (src: string) => Boolean(getPublishedPortfolioVideo(src));

export const resolvePlayablePortfolioVideoSrc = (src: string) => {
  if (!src.startsWith("/portfolio/")) return src;
  return shouldUseLocalPortfolioAssets() ? src : null;
};

export const resolvePortfolioExtraAsset = (src: string) => {
  if (!src.startsWith("/portfolio/")) return src;
  return shouldUseLocalPortfolioAssets() ? src : (DEPLOYABLE_PORTFOLIO_ASSETS[src] ?? null);
};
