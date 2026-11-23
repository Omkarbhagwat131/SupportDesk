import type { TicketListQuery, TicketPriority, TicketStatus } from "../api/tickets";
import { Input } from "../../../components/ui/Input";

type Props = {
  value: TicketListQuery;
  onChange: (value: TicketListQuery) => void;
};

export function TicketFilters({ value, onChange }: Props) {
  return (
    <div className="filters">
      <Input
        aria-label="Search tickets"
        label="Search tickets"
        type="search"
        placeholder="Search tickets..."
        value={value.search ?? ""}
        onChange={(event) => onChange({ ...value, search: event.target.value, page: 1 })}
      />
      <Input
        aria-label="Filter by assignee ID"
        label="Assignee ID"
        placeholder="Assignee ID"
        value={value.assigneeId ?? ""}
        onChange={(event) => onChange({ ...value, assigneeId: event.target.value, page: 1 })}
      />
      <select
        aria-label="Filter by status"
        value={value.status ?? ""}
        onChange={(event) => onChange({ ...value, status: (event.target.value || undefined) as TicketStatus | undefined, page: 1 })}
      >
        <option value="">All statuses</option>
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="WAITING_ON_CUSTOMER">Waiting on customer</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
      </select>
      <select
        aria-label="Filter by priority"
        value={value.priority ?? ""}
        onChange={(event) => onChange({ ...value, priority: (event.target.value || undefined) as TicketPriority | undefined, page: 1 })}
      >
        <option value="">All priorities</option>
        <option value="P1">P1</option>
        <option value="P2">P2</option>
        <option value="P3">P3</option>
        <option value="P4">P4</option>
      </select>
      <select
        aria-label="Sort tickets"
        value={`${value.sortBy}:${value.sortOrder}`}
        onChange={(event) => {
          const [sortBy, sortOrder] = event.target.value.split(":") as [TicketListQuery["sortBy"], TicketListQuery["sortOrder"]];
          onChange({ ...value, sortBy, sortOrder, page: 1 });
        }}
      >
        <option value="createdAt:desc">Newest first</option>
        <option value="createdAt:asc">Oldest first</option>
        <option value="updatedAt:desc">Recently updated</option>
        <option value="priority:asc">Priority ascending</option>
        <option value="subject:asc">Subject A-Z</option>
        <option value="subject:desc">Subject Z-A</option>
      </select>
    </div>
  );
}
