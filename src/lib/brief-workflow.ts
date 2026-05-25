type WorkflowValidationResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      message: string;
    };

type BriefSessionScoped = {
  session_id: string;
};

type ConfirmedBlueprintScoped = {
  session_id: string;
  status: "draft" | "confirmed" | string | null;
};

type OutlineVariantScoped = {
  session_id: string;
  scope: "outline" | "chapter" | "full" | string | null;
  brief_id: string | null;
};

type ChapterVariantScoped = {
  session_id: string;
  scope: "outline" | "chapter" | "full" | string | null;
  brief_id: string | null;
  chapter_index: number | null;
};

export function validateConfirmedBlueprintForBrief(params: {
  brief: BriefSessionScoped;
  blueprint: ConfirmedBlueprintScoped | null;
}): WorkflowValidationResult {
  const { brief, blueprint } = params;

  if (!blueprint) {
    return {
      ok: false,
      status: 409,
      message: "项目尚无蓝图，无法继续当前操作。",
    };
  }
  if (blueprint.session_id !== brief.session_id) {
    return { ok: false, status: 409, message: "简报和蓝图不属于同一项目。" };
  }
  if (blueprint.status !== "confirmed") {
    return { ok: false, status: 409, message: "请先在工作台确认蓝图。" };
  }

  return { ok: true };
}

export function validateOutlineVariantForBrief(params: {
  brief: BriefSessionScoped & { id: string };
  outlineVariant: OutlineVariantScoped | null;
}): WorkflowValidationResult {
  const { brief, outlineVariant } = params;

  if (!outlineVariant) {
    return { ok: false, status: 404, message: "未找到大纲。" };
  }
  if (outlineVariant.scope !== "outline") {
    return { ok: false, status: 409, message: "传入的不是大纲版本。" };
  }
  if (outlineVariant.session_id !== brief.session_id) {
    return { ok: false, status: 409, message: "大纲和简报不属于同一项目。" };
  }
  if (outlineVariant.brief_id !== brief.id) {
    return { ok: false, status: 409, message: "大纲不属于当前简报链。" };
  }

  return { ok: true };
}

export function validatePreviousChapterVariantForBrief(params: {
  brief: BriefSessionScoped & { id: string };
  chapterIndex: number;
  previousVariant: ChapterVariantScoped | null;
}): WorkflowValidationResult {
  const { brief, chapterIndex, previousVariant } = params;

  if (!previousVariant) {
    return { ok: false, status: 404, message: "未找到上一版章节稿。" };
  }
  if (previousVariant.scope !== "chapter") {
    return { ok: false, status: 409, message: "上一版必须是章节稿。" };
  }
  if (previousVariant.session_id !== brief.session_id) {
    return {
      ok: false,
      status: 409,
      message: "上一版和当前简报不属于同一项目。",
    };
  }
  if (previousVariant.brief_id !== brief.id) {
    return { ok: false, status: 409, message: "上一版不属于当前简报链。" };
  }
  if (previousVariant.chapter_index !== chapterIndex) {
    return { ok: false, status: 409, message: "上一版不属于当前章节。" };
  }

  return { ok: true };
}
