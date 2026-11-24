import type { ReactNode } from "react";
import type { TicketPriority, TicketStatus } from "../../features/tickets/api/tickets";
import { ticketStatusOptions } from "../../features/tickets/status";

export type BadgeProps =
  | { type: "status"; value: TicketStatus; children?: never }
  | { type: "priority"; value: TicketPriority; children?: never }
  | { type: "neutral"; value?: never; children: ReactNode };

export function Badge(props: BadgeProps) {
  if (props.type === "status") {
    const label = ticketStatusOptions.find((option) => option.value === props.value)?.label ?? props.value;
    return <span className={`badge status-${props.value.toLowerCase()}`}>{label}</span>;
  }
  if (props.type === "priority") {
    return <span className={`badge priority-${props.value.toLowerCase()}`}>{props.value}</span>;
  }
  return <span className="badge badge-neutral">{props.children}</span>;
}
