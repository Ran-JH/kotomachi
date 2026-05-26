/** @type {import('next').NextConfig} */
const nextConfig = {
  // Edge-TTS 依赖 ws + bufferutil，必须排除 webpack 打包，否则 bufferUtil.mask 报错
  experimental: {
    serverComponentsExternalPackages: [
      "edge-tts-universal",
      "ws",
      "bufferutil",
      "utf-8-validate",
    ],
  },
};

export default nextConfig;
