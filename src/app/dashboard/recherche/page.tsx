import { DashboardSearchResultsPage } from "@/features/dashboard/components/DashboardSearchResultsPage";

export default async function SearchPage({
 searchParams
}: {
 searchParams: Promise<{ q?: string }>;
}) {
 const { q } = await searchParams;
 return <DashboardSearchResultsPage query={q?.trim() ?? ""} />;
}
