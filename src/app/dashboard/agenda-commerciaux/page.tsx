import { AgendaCalendar } from "@/features/agenda/AgendaCalendar";
import { getAgendaEvents, getAgendaTodos } from "@/features/agenda/agendaEvents";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

export default async function DashboardCommercialAgendaPage() {
 await requirePermission("agenda");
 const [events, todos] = await Promise.all([getAgendaEvents(), getAgendaTodos()]);
 return <AgendaCalendar events={events} todos={todos} />;
}
