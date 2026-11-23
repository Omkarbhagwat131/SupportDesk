import type { ReactNode } from "react";

type TableProps = {
  caption: string;
  headers: string[];
  children?: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
};

export function Table({ caption, headers, children, emptyMessage, isEmpty }: TableProps) {
  if (isEmpty) {
    return (
      <div className="empty-state" role="status">
        {emptyMessage ?? "No records found."}
      </div>
    );
  }

  return (
    <div className="table-wrap" role="region" aria-label={caption} tabIndex={0}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr>
        </thead>
        {children}
      </table>
    </div>
  );
}
