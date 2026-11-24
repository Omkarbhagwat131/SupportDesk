import { Badge } from "../../../components/ui/Badge";
import type { TicketStatus } from "../api/tickets";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge type="status" value={status} />;
}
