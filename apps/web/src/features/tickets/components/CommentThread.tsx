import type { TicketComment } from "../api/comments";

export function CommentThread({
  comments,
  showInternal,
}: {
  comments: TicketComment[];
  showInternal: boolean;
}) {
  const visibleComments = showInternal
    ? comments
    : comments.filter((comment) => !comment.isInternal);

  if (visibleComments.length === 0) {
    const message = comments.length === 0 ? "No comments yet." : "No public comments yet.";
    return <div className="empty-state" role="status">{message}</div>;
  }

  return (
    <ol className="comment-thread">
      {visibleComments.map((comment) => (
        <li className="comment-card" key={comment.id}>
          <div className="comment-header">
            <span className="comment-avatar" aria-hidden="true">
              {comment.author.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="comment-meta">
              <strong>{comment.author.name}</strong>
              <time dateTime={comment.createdAt}>
                {new Date(comment.createdAt).toLocaleString()}
              </time>
              {comment.isInternal && <span className="badge comment-internal">Internal</span>}
            </div>
          </div>
          <p>{comment.body}</p>
        </li>
      ))}
    </ol>
  );
}
