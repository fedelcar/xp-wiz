// Preview-only page for dev testing — bypass auth to see the dashboard UI
import { DashboardPreview } from "@/components/DashboardPreview";

export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") return null;
  return <DashboardPreview />;
}
