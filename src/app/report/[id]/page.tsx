"use client";

import { EvaluationReportView } from "@/components/report/EvaluationReport";
import { useLocationId } from "@/lib/hooks/useLocationId";

export default function ReportPage() {
  const id = useLocationId();
  return <EvaluationReportView sessionId={id} />;
}
