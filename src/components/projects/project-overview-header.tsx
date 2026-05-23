import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MetaRow } from "@/components/meta-row";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import type { ProjectOverviewNextAction } from "@/lib/projects/overview";

export function ProjectOverviewHeader({
  title,
  statusLabel,
  progressLabel,
  nextAction,
}: {
  title: string;
  statusLabel: string;
  progressLabel: string;
  nextAction: ProjectOverviewNextAction;
}) {
  return (
    <PageHeader
      label="project"
      title={title}
      description={progressLabel}
      action={
        <Button asChild variant="terminal">
          <Link href={nextAction.href}>
            {nextAction.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      }
      meta={
        <MetaRow
          items={[
            { label: "status", value: statusLabel },
            { label: "next", value: nextAction.label },
          ]}
        />
      }
    />
  );
}
