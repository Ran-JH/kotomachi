# TTS Audition Matrix

这个工具用于本地试听 Kotomachi 当前 classic 火山 TTS v1 的不同 `voice_type`，不是线上用户功能。

## 目标

- 横向比较多个 `voice_type`
- 在多个 NPC 固定测试句上试听效果
- 产出人工评分用的 `audition-index.md`
- 最后再由人工决定是否把结果写回 `lib/tts-voice-profiles.ts`

## 文件

- `scripts/tts-audition-matrix.mjs`
  - 本地脚本
  - 默认 `dry-run`
  - 只有显式加 `--confirm` 才会真正调用 classic 火山 TTS API
- `scripts/tts-audition-candidates.example.json`
  - 候选音色示例文件
  - 建议先复制成你自己的本地 candidates 文件，再删除 placeholder 后使用

## 安全边界

- 不修改生产 `/api/tts`
- 不修改 `lib/tts-voice-profiles.ts`
- 不修改 `lib/volcengine.ts`
- 不修改 `package.json`
- 不修改 `.env`
- 不引入新依赖
- 默认最多只处理 60 条，避免一次生成过多音频
- 不要提交 `.tmp/tts-audition/` 下生成的 mp3

## 候选音色来源

脚本会合并三部分候选列表：

1. baseline
   - `BV421_streaming`
   - `BV524_streaming`
2. `scripts/tts-audition-matrix.mjs` 顶部的 `EXTRA_CANDIDATE_VOICE_TYPES`
3. 可选的 `--candidates=...` JSON 文件

## Candidate filtering

脚本会做一层基础过滤：

- 忽略空字符串
- 忽略包含 `PASTE_` 或 `PLACEHOLDER` 的值
- 对重复 `voice_type` 去重
- `dry-run` 会打印最终有效候选列表
- 如果有被忽略的占位值，也会打印出来

这能避免 example 文件里的 `PASTE_MORE_CLASSIC_VOICE_TYPES_HERE` 在 `--confirm` 时被当成真实 `voice_type` 请求。

## 运行方式

Dry-run：

```powershell
node scripts/tts-audition-matrix.mjs
```

默认 `dry-run` 只会打印计划并写 `audition-index.md`，不会调用 API，也不会消耗真实调用次数。

确认生成：

```powershell
node scripts/tts-audition-matrix.mjs --confirm
```

只有显式加 `--confirm` 才会真正调用 classic 火山 TTS API，并真实消耗调用次数。

限制条数：

```powershell
node scripts/tts-audition-matrix.mjs --confirm --limit=6
```

带候选文件：

```powershell
node scripts/tts-audition-matrix.mjs --confirm --limit=6 --candidates=./scripts/tts-audition-candidates.example.json
```

## 输出

默认输出到：

```text
.tmp/tts-audition/
```

包含：

- `audition-index.md`
- `{npcId}__{voiceType}__s{index}.mp3`

## 环境变量

脚本会读取当前终端中的 classic 火山 TTS 环境变量，变量名与 `lib/volcengine.ts` 一致：

- `VOLCENGINE_SPEECH_APP_ID`
- `VOLCENGINE_SPEECH_ACCESS_TOKEN`
- `VOLCENGINE_SPEECH_API_KEY`
- `VOLCENGINE_SPEECH_CLUSTER`，可选，默认 `volcano_tts`

注意：

- 不会打印 secret
- 缺少凭据时会报清楚错误，但不会输出 token
- 这是纯 Node 脚本，不会自动加载 `.env.local`

## 关于 normalization

为了不改 build 和 tooling，这个脚本没有直接 import TypeScript 里的 `normalizeTextForTts`。

脚本内部复制了一份最小可用版 normalization 逻辑，优先覆盖这次试听最关键的 case：

- `VNL`
- `AI`
- `JLPT`
- `SNS`
- `LINE`
- `API`
- `6月20日` 这类日期读法
- 基础停顿与标点清理

这样做是为了让 audition 更接近当前生产 TTS 的输入文本，同时避免为了脚本去改项目编译配置。

## 使用建议

1. 先跑 `dry-run`，确认数量和输出路径
2. 先加 1 到 2 个候选 `voice_type`
3. 不要直接把 example 文件当长期本地配置
4. 先复制一份自己的 candidates 文件
5. 删除 placeholder 后再用 `--confirm`
6. 先用 `--confirm --limit=6` 小批量生成
7. 随机试听几条 mp3
8. 再逐步扩大试听范围
