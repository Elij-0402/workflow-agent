import type { CreativeBrief } from "@/lib/types/creative-brief";

const STYLE_TONE_LABEL: Record<
  NonNullable<CreativeBrief["style_directives"]["tone"]>,
  string
> = {
  keep: "保留原作语调",
  lyrical: "抒情、富有诗意",
  plain: "平实、克制",
  humorous: "幽默、轻松",
  ironic: "冷峻、反讽",
  noir: "黑色、阴郁",
  classical: "古典端庄",
};

const RHYTHM_LABEL: Record<
  NonNullable<CreativeBrief["style_directives"]["rhythm"]>,
  string
> = {
  keep: "保留原作节奏",
  slow: "放慢节奏，多铺陈",
  moderate: "正常推进",
  fast: "加快节奏，少铺陈",
};

const DIALOGUE_LABEL: Record<
  NonNullable<CreativeBrief["style_directives"]["dialogue_ratio"]>,
  string
> = {
  keep: "对话/描写比例不变",
  more_dialogue: "增加对话占比",
  less_dialogue: "减少对话，多描写/叙述",
};

const SENSORY_LABEL: Record<
  NonNullable<CreativeBrief["style_directives"]["sensory_density"]>,
  string
> = {
  keep: "感官描写密度不变",
  sparse: "稀疏感官描写",
  rich: "密集感官描写",
};

const REGISTER_LABEL: Record<
  NonNullable<CreativeBrief["style_directives"]["prose_register"]>,
  string
> = {
  keep: "保留原作文体",
  modern: "现代汉语",
  web_novel: "网文风",
  literary: "文学性较强",
  classical_chinese: "偏文言",
};

const STRICTNESS_LABEL: Record<
  CreativeBrief["retention_rules"][number]["strictness"],
  string
> = {
  must_keep: "必须保留",
  prefer_keep: "尽量保留",
  flexible: "可调整",
};

const SECTION_LABEL: Record<
  CreativeBrief["retention_rules"][number]["section"],
  string
> = {
  characters: "人物",
  relationships: "关系",
  world_rules: "世界规则",
  conflicts: "冲突",
  plot_beats: "情节节点",
  themes: "主题",
};

/**
 * 把 brief 序列化为可塞进 system/user prompt 的中文片段。
 * 输出按"人设 / 情节 / 文风 / 保留规则"分段，未填的段省略。
 */
export function composeBriefIntoPrompt(brief: CreativeBrief): string {
  const sections: string[] = [];

  if (brief.persona_directives.length > 0) {
    const lines = brief.persona_directives.map((d, idx) => {
      const fields = d.fields ?? {};
      const fieldStrs = Object.entries(fields)
        .filter(([, v]) => Boolean(v))
        .map(([k, v]) => `${k}=${v}`);
      const tail = fieldStrs.length > 0 ? `（${fieldStrs.join("，")}）` : "";
      return `${idx + 1}. [${d.change_type}] 角色「${d.character_name}」${tail}`;
    });
    sections.push(["【人设改造】", ...lines].join("\n"));
  }

  if (brief.plot_directives.length > 0) {
    const lines = brief.plot_directives.map((d, idx) => {
      const target = d.target_beat_id
        ? `目标节点 ${d.target_beat_id}`
        : "（新节点）";
      const beat = d.new_beat
        ? `「${d.new_beat.title ?? "（无标题）"}」${d.new_beat.description ?? ""}`
        : "";
      const note = d.note ? `——${d.note}` : "";
      return `${idx + 1}. [${d.action}] ${target} ${beat}${note}`.trim();
    });
    sections.push(["【情节调整】", ...lines].join("\n"));
  }

  const s = brief.style_directives;
  const styleLines = [
    `语调：${STYLE_TONE_LABEL[s.tone]}`,
    `节奏：${RHYTHM_LABEL[s.rhythm]}`,
    `对话：${DIALOGUE_LABEL[s.dialogue_ratio]}`,
    `感官：${SENSORY_LABEL[s.sensory_density]}`,
    `文体：${REGISTER_LABEL[s.prose_register]}`,
  ];
  if (s.extra_instructions.trim()) {
    styleLines.push(`补充指令：${s.extra_instructions.trim()}`);
  }
  const styleHasOverride =
    s.tone !== "keep" ||
    s.rhythm !== "keep" ||
    s.dialogue_ratio !== "keep" ||
    s.sensory_density !== "keep" ||
    s.prose_register !== "keep" ||
    s.extra_instructions.trim().length > 0;
  if (styleHasOverride) {
    sections.push(["【文风调整】", ...styleLines].join("\n"));
  }

  if (brief.retention_rules.length > 0) {
    const lines = brief.retention_rules.map((r, idx) => {
      const scope =
        r.target_ids.length > 0
          ? `节点 ${r.target_ids.join("、")}`
          : `${SECTION_LABEL[r.section]} 整段`;
      const note = r.note ? ` ——${r.note}` : "";
      return `${idx + 1}. [${STRICTNESS_LABEL[r.strictness]}] ${SECTION_LABEL[r.section]} · ${scope}${note}`;
    });
    sections.push(["【保留规则】", ...lines].join("\n"));
  }

  if (sections.length === 0) return "";
  return ["【创意简报】", ...sections].join("\n\n");
}

/**
 * 检测同一节点上互相冲突的指令（保留 + 删除/替换、同节点既保留又改写等）。
 * 返回中文消息数组；空数组=无冲突。供前端 toast 提醒；不阻断保存。
 */
export function detectBriefConflicts(brief: CreativeBrief): string[] {
  const conflicts: string[] = [];

  const mustKeepBeatIds = new Set<string>();
  for (const rule of brief.retention_rules) {
    if (rule.section === "plot_beats" && rule.strictness === "must_keep") {
      for (const id of rule.target_ids) mustKeepBeatIds.add(id);
    }
  }

  for (const d of brief.plot_directives) {
    if (!d.target_beat_id) continue;
    if (
      mustKeepBeatIds.has(d.target_beat_id) &&
      (d.action === "delete" || d.action === "replace")
    ) {
      conflicts.push(
        `情节节点 ${d.target_beat_id} 同时被「必须保留」和「${d.action}」——请二选一。`,
      );
    }
  }

  const mustKeepCharacters = new Set<string>();
  for (const rule of brief.retention_rules) {
    if (rule.section === "characters" && rule.strictness === "must_keep") {
      for (const id of rule.target_ids) mustKeepCharacters.add(id);
    }
  }

  for (const d of brief.persona_directives) {
    if (
      mustKeepCharacters.has(d.character_name) &&
      (d.change_type === "remove" || d.change_type === "replace")
    ) {
      conflicts.push(
        `人物「${d.character_name}」同时被「必须保留」和「${d.change_type}」——请二选一。`,
      );
    }
  }

  return conflicts;
}
