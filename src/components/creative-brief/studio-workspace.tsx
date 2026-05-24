"use client";

import { useState } from "react";

import { BriefEditor } from "@/components/creative-brief/brief-editor";
import {
  ChapterIterateStreamer,
  type ChapterVariantSummary,
} from "@/components/creative-brief/chapter-iterate-streamer";
import { OutlineStreamer } from "@/components/creative-brief/outline-streamer";
import type { CreativeBrief } from "@/lib/types/creative-brief";
import type { Outline } from "@/lib/prompts/preview-outline";

type Props = {
  briefId: string;
  initial: CreativeBrief;
  initialOutlineVariantId: string | null;
  initialOutline: Outline | null;
  initialChapterVariants: ChapterVariantSummary[];
};

export function StudioWorkspace({
  briefId,
  initial,
  initialOutlineVariantId,
  initialOutline,
  initialChapterVariants,
}: Props) {
  const [outlineVariantId, setOutlineVariantId] = useState<string | null>(
    initialOutlineVariantId,
  );
  const [outline, setOutline] = useState<Outline | null>(initialOutline);

  return (
    <div className="grid gap-8 xl:grid-cols-2 xl:gap-10">
      <div className="min-w-0 space-y-8">
        <BriefEditor mode={{ kind: "edit", briefId }} initial={initial} />
        <OutlineStreamer
          briefId={briefId}
          onOutlineReady={({ variantId, outline: nextOutline }) => {
            setOutlineVariantId(variantId);
            setOutline(nextOutline);
          }}
        />
      </div>
      <section className="min-w-0 space-y-8 xl:border-l xl:border-border/60 xl:pl-10">
        <ChapterIterateStreamer
          briefId={briefId}
          outlineVariantId={outlineVariantId}
          outline={outline}
          initialChapterVariants={initialChapterVariants}
        />
      </section>
    </div>
  );
}
