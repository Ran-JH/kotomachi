"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getNpcState, getTimeOfDay, getWorldContext, NPC_AVATARS, type NpcId } from "@/lib/npc";

/* ============================================================
   首页街景 — 单张街道图 + SVG 热区覆盖
   ============================================================ */

/** 建筑热区配置 — 对应 SVG 内建筑位置 */
const BUILDING_ZONES: {
  id: NpcId;
  npc: string;
  npcSub: string;
  /** 建筑PNG文件名 */
  file: string;
  /** SVG x 坐标 */
  x: number;
  /** SVG 宽度 */
  width: number;
}[] = [
  {
    id: "misaki",
    npc: "美咲",
    npcSub: "みさき",
    file: "cafe3.png",
    x: 0,
    width: 954,
  },
  {
    id: "kimura",
    npc: "木村",
    npcSub: "きむら",
    file: "conbini3.png",
    x: 946,
    width: 804,
  },
  {
    id: "taisho",
    npc: "大将",
    npcSub: "たいしょう",
    file: "izakaya3.png",
    x: 1740,
    width: 780,
  },
];

const TIME_LABELS: Record<string, string> = {
  朝: "朝の街",
  昼: "昼の街",
  夕: "夕の街",
  夜: "夜の街",
};

/** 时段对应的背景渐变 — 在米白基础上微调，体现天色变化 */
const TIME_BG: Record<string, string> = {
  朝: "linear-gradient(180deg, #F5E4CE 0%, #F3EDE0 50%)",   // 晨光暖橘
  昼: "#F3EDE0",                                                // 正午明亮米白
  夕: "linear-gradient(180deg, #EEDDC8 0%, #F3EDE0 45%)",    // 夕照琥珀
  夜: "linear-gradient(180deg, #DDD6C8 0%, #E8E1D4 60%)",    // 夜幕沉暖
};

export default function Home() {
  const router = useRouter();
  const timeOfDay = getTimeOfDay();
  const worldContext = getWorldContext();
  const [hoveredId, setHoveredId] = useState<NpcId | null>(null);
  const [focusedId, setFocusedId] = useState<NpcId | null>(null);
  const activeId = hoveredId ?? focusedId;

  const openChat = (npcId: NpcId) => {
    router.push(`/chat/${npcId}`);
  };

  return (
    <main
    className="min-h-screen flex flex-col items-center justify-start relative overflow-hidden transition-colors duration-1000"
    style={{ background: TIME_BG[timeOfDay] }}
    >
      {/* ====== 顶部品牌区 ====== */}
      <div className="w-full max-w-[2529px] px-10 pt-8 self-start">
        <h1 className="text-2xl font-light tracking-[0.3em] text-[#28231A] font-serif">
          言街 Kotomachi
        </h1>
        <p className="text-[10px] text-[#7A7060]/60 mt-0.5 tracking-wider">
          {TIME_LABELS[timeOfDay]} · {worldContext.atmosphere}
        </p>
      </div>

      {/* ====== 街景主体 — SVG 内嵌建筑PNG ====== */}
      <div className="relative w-full max-w-[2529px] px-4 flex-shrink-0 mt-24">
        <svg
          viewBox="0 0 2529 795"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto block"
        >
          {BUILDING_ZONES.map((zone) => (
            <g key={zone.id}>
              {/* 建筑图片 — hover 时沿轮廓发光 */}
              <image
                href={`/buildings/${zone.file}`}
                x={zone.x}
                y={0}
                width={zone.width}
                height={795}
                preserveAspectRatio="xMidYMid meet"
                style={{
                  filter: activeId === zone.id
                    ? "drop-shadow(0 0 30px rgba(201,168,76,0.72)) drop-shadow(0 10px 22px rgba(40,35,26,0.16)) brightness(1.08)"
                    : "drop-shadow(0 4px 12px rgba(40,35,26,0.12)) brightness(1)",
                  transition: "filter 0.35s ease",
                }}
              />
              {/* 透明热区，负责事件 */}
              <rect
                x={zone.x}
                y={0}
                width={zone.width}
                height={795}
                fill="transparent"
                role="link"
                tabIndex={0}
                focusable="true"
                aria-label={`${zone.npc}と話す`}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setHoveredId(zone.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setFocusedId(zone.id)}
                onBlur={() => setFocusedId(null)}
                onClick={() => openChat(zone.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openChat(zone.id);
                  }
                }}
              />
            </g>
          ))}
        </svg>

        {/* NPC 信息卡 — hover 时浮现 */}
        {BUILDING_ZONES.map((zone) => {
          const npcState = getNpcState(zone.id);
          const isActive = activeId === zone.id;
          // 信息卡定位：基于热区中心点的百分比
          const centerPercent = ((zone.x + zone.width / 2) / 2529) * 100;

          return (
            <div
              key={`card-${zone.id}`}
              className="absolute z-20 -translate-x-1/2 -translate-y-full"
              style={{
                left: `${centerPercent}%`,
                top: "0",
              }}
            >
              <div
                className={`transition-all duration-300 ease-out
                  ${isActive
                    ? "opacity-100 -translate-y-5 pointer-events-auto"
                    : "opacity-0 -translate-y-2 pointer-events-none"
                  }`}
              >
                <div className="bg-[#FAF6EE]/95 border border-[rgba(40,35,26,0.16)] rounded-xl px-4 py-3
                  shadow-[0_10px_28px_rgba(40,35,26,0.14),0_2px_6px_rgba(40,35,26,0.08)] min-w-[188px] backdrop-blur-sm">
                {/* 头像 + 姓名 */}
                <div className="flex items-center gap-2.5 mb-1.5">
                  <img
                    src={NPC_AVATARS[zone.id]}
                    alt={zone.npc}
                    className="w-9 h-9 rounded-full object-cover border border-[rgba(40,35,26,0.08)]"
                  />
                  <div>
                    <span className="text-sm font-medium text-[#28231A] block leading-tight">
                      {zone.npc}
                    </span>
                    <span className="text-[9px] text-[#7A7060]">{zone.npcSub}</span>
                  </div>
                </div>
                {/* 心里话 */}
                <p className="text-[10px] text-[#6F6556] leading-relaxed pl-0.5">
                  ☁️ {npcState.thought}
                </p>
                <p className="mt-2 inline-flex items-center rounded-full bg-[#E8E0CE]/70 px-2.5 py-1 text-[9px] font-medium tracking-wide text-[#2D4A1F]">
                  話してみる
                </p>
                {/* 小三角 */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2
                  w-3 h-3 bg-[#FAF6EE] border-r border-b border-[rgba(40,35,26,0.1)]
                  rotate-45" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ====== 底部提示 ====== */}
      <div className="mt-8 mb-6 text-center space-y-3">
        <p className="text-base text-[#7A7060] font-serif tracking-[0.25em] font-light">
          {worldContext.ambientTexts[new Date().getDate() % worldContext.ambientTexts.length]}
        </p>
        <p className="inline-flex rounded-full border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE]/55 px-4 py-2 text-[12px] text-[#6F6556] shadow-[0_2px_10px_rgba(40,35,26,0.04)]">
          気になるお店をクリックして、住人と話してみよう。
        </p>
      </div>
    </main>
  );
}
