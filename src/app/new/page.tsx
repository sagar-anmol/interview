import { SetupForm } from "@/components/setup/SetupForm";
import type { PageProps } from "@/lib/types/next";


export const instant = false;

export default async function NewInterviewPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const mode = params?.mode === "peer" ? "peer" : "ai";
  return <SetupForm initialMode={mode} />;
}
