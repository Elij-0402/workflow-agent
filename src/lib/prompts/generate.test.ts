import assert from "node:assert/strict";
import test from "node:test";

import { buildGenerateUserPrompt, scopeToMaxTokens } from "./generate.ts";
import type { GenerateAnalyses, GenerateConfig } from "@/lib/types";

const analyses: GenerateAnalyses = {
  worldview: {
    type: "仙侠",
    setting: "乱世王朝末期，修真宗门与凡俗皇权并存。",
    locations: [
      {
        name: "临安",
        description: "南方重镇，消息流通最快。",
        importance: "high",
      },
    ],
    power_system: "剑修以心证道，旁门依符箓借势。",
    rules: ["修为越高，越容易引动天劫。"],
    summary: "这是一个宗门与皇权彼此牵制的修真世界。",
  },
  characters: {
    characters: [
      {
        name: "沈砚",
        role: "protagonist",
        traits: ["克制", "敏锐"],
        background: "寒门出身，被迫卷入宗门争斗。",
        description: "外冷内热，行动谨慎。",
      },
    ],
    relationships: [
      {
        from: "沈砚",
        to: "顾遥",
        type: "盟友",
        description: "因共同调查旧案而结盟。",
      },
    ],
    summary: "主角与盟友关系清晰，人物驱动力集中在自保与求真。",
  },
  narrative: {
    structure: "三幕式",
    viewpoint: "第三人称有限",
    pacing: "前缓后急",
    themes: ["真相", "背叛"],
    turning_points: [
      {
        title: "旧案重启",
        description: "主角被迫重新调查十年前旧案。",
        impact: 8,
      },
    ],
    conflicts: ["人vs人", "人vs自我"],
    summary: "叙事依靠旧案调查推进，冲突逐步升级。",
  },
};

const config: GenerateConfig = {
  strategy: "theme-graft",
  innovation: 8,
  viewpoint: "first-person",
  style: "modern",
  output_scope: "outline",
  extra_instructions: "把主角的选择写得更冒险。",
};

test("maps output scope to token ceilings", () => {
  assert.equal(scopeToMaxTokens("outline"), 2048);
  assert.equal(scopeToMaxTokens("single-chapter"), 4096);
  assert.equal(scopeToMaxTokens("three-chapters"), 8192);
});

test("builds prompt with config, analyses, and excerpt", () => {
  const prompt = buildGenerateUserPrompt({
    analyses,
    config,
    excerpt: "第一章 风起\n沈砚在雨夜里推开旧库房的门。",
  });

  assert.match(prompt, /把主角的选择写得更冒险/);
  assert.match(prompt, /返回章节大纲/);
  assert.match(prompt, /"name": "临安"/);
  assert.match(prompt, /"name": "沈砚"/);
  assert.match(prompt, /第一章 风起/);
});
