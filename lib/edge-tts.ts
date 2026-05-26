import { Communicate } from "edge-tts-universal";
import type { NpcId } from "@/lib/npc";

export async function synthesizeEdgeTts(
  text: string,
  npcId: NpcId
): Promise<Buffer> {
  let voiceName = "ja-JP-NanamiNeural";
  let rate = "+0%";

  if (npcId === "kimura") {
    voiceName = "ja-JP-KeitaNeural";
    rate = "+8%";
  } else if (npcId === "taisho") {
    voiceName = "ja-JP-NaokiNeural";
  }

  const communicate = new Communicate(text, { voice: voiceName, rate });
  const buffers: Buffer[] = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === "audio" && chunk.data) {
      buffers.push(Buffer.from(chunk.data));
    }
  }
  return Buffer.concat(buffers);
}
