import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CommentForm } from "../features/tickets/components/CommentForm";
import { CommentThread } from "../features/tickets/components/CommentThread";
import { TicketStatusBadge } from "../features/tickets/components/TicketStatusBadge";
import { useTicket } from "../features/tickets/hooks/useTicket";
import { useTicketComments } from "../features/tickets/hooks/useTicketComments";
import { useUpdateTicket } from "../features/tickets/hooks/useTicketMutations";
import { ticketStatusOptions } from "../features/tickets/status";
import { ApiRequestError } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import {
  categorizeTicket,
  suggestReply,
  type TicketPriority,
  type TicketStatus,
} from "../features/tickets/api/tickets";
import { ticketCategorySchema, type CategorizeTicketResult } from "../features/tickets/schemas";
import { listAgents } from "../features/users/api/users";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

const ticketPriorities = ["P1", "P2", "P3", "P4"] as const satisfies readonly TicketPriority[];

function isTicketPriority(value: string): value is TicketPriority {
  return ticketPriorities.some((priority) => priority === value);
}

function getTicketLoadError(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 404) {
    return "Ticket not found or you don't have access to it.";
  }
  if (error instanceof ApiRequestError && error.status === 403) {
    return "You don't have permission to view this ticket.";
  }
  return error instanceof Error ? error.message : "Unable to load this ticket.";
}

export function TicketDetailPage() {
  const { ticketId = "" } = useParams();
  const location = useLocation();
  const user = getStoredUser();
  const isAgent = user?.role === "AGENT";
  const isAdmin = user?.role === "ADMIN";
  const isStaff = isAgent || isAdmin;
  const canComment = user?.role === "CUSTOMER" || isAgent;
  const ticketQuery = useTicket(ticketId);
  const commentsQuery = useTicketComments(ticketId, Boolean(ticketQuery.data));
  const updateMutation = useUpdateTicket(ticketId);
  const agentsQuery = useQuery({
    queryKey: ["users", "agents"],
    queryFn: listAgents,
    enabled: isAdmin,
  });
  const [statusError, setStatusError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [draftReply, setDraftReply] = useState<string | null>(null);
  const [draftError, setDraftError] = useState("");
  const [isReviewingReply, setIsReviewingReply] = useState(false);
  const [isSuggestingReply, setIsSuggestingReply] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState<CategorizeTicketResult | null>(null);
  const [categoryError, setCategoryError] = useState("");
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isApplyingCategory, setIsApplyingCategory] = useState(false);
  const ticket = ticketQuery.data;

  async function changeStatus(status: TicketStatus) {
    setStatusError("");
    try {
      await updateMutation.mutateAsync({ status });
    } catch (reason) {
      setStatusError(reason instanceof Error ? reason.message : "Unable to update ticket status.");
    }
  }

  async function requestReplySuggestion() {
    setDraftReply(null);
    setIsReviewingReply(false);
    setDraftError("");
    setIsSuggestingReply(true);
    let response = "";
    try {
      await suggestReply(ticketId, (chunk) => {
        response += chunk;
      });
      if (!response.trim()) throw new Error("Gemini returned an empty reply draft.");
      setDraftReply(response);
      setIsReviewingReply(true);
    } catch (reason) {
      setDraftReply(null);
      setDraftError(reason instanceof Error ? reason.message : "Unable to generate a reply draft.");
    } finally {
      setIsSuggestingReply(false);
    }
  }

  async function requestCategorization() {
    setCategorySuggestion(null);
    setCategoryError("");
    setIsCategorizing(true);
    try {
      setCategorySuggestion(await categorizeTicket(ticketId));
    } catch (reason) {
      setCategoryError(reason instanceof Error ? reason.message : "Unable to categorize this ticket.");
    } finally {
      setIsCategorizing(false);
    }
  }

  async function applyCategorization() {
    if (!categorySuggestion) return;
    setCategoryError("");
    setIsApplyingCategory(true);
    try {
      await updateMutation.mutateAsync({
        category: categorySuggestion.category,
        priority: categorySuggestion.priority,
      });
      setCategorySuggestion(null);
    } catch (reason) {
      setCategoryError(reason instanceof Error ? reason.message : "Unable to apply the suggestion.");
    } finally {
      setIsApplyingCategory(false);
    }
  }

  async function changeCategory(category: string) {
    setAdminError("");
    try {
      await updateMutation.mutateAsync({ category: category || null });
    } catch (reason) {
      setAdminError(reason instanceof Error ? reason.message : "Unable to update the ticket category.");
    }
  }

  async function changeAssignee(assigneeId: string) {
    setAdminError("");
    try {
      await updateMutation.mutateAsync({ assigneeId: assigneeId || null });
    } catch (reason) {
      setAdminError(reason instanceof Error ? reason.message : "Unable to assign this ticket.");
    }
  }

  function changeSuggestedCategory(category: string) {
    const parsed = ticketCategorySchema.safeParse(category);
    if (parsed.success) {
      setCategorySuggestion((current) => current ? { ...current, category: parsed.data } : null);
    }
  }

  function changeSuggestedPriority(priority: string) {
    if (isTicketPriority(priority)) {
      setCategorySuggestion((current) => current ? { ...current, priority } : null);
    }
  }

  if (ticketQuery.isPending || ticketQuery.isFetching) {
    return <div className="empty-state" role="status">Loading ticket...</div>;
  }

  if (ticketQuery.error || !ticket) {
    return (
      <section className="ticket-detail-page">
        <Link to="/tickets" className="back-link">← Back to tickets</Link>
        <div className="form-error" role="alert">
          {ticketQuery.error ? getTicketLoadError(ticketQuery.error) : "Ticket not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="ticket-detail-page">
      <Link to="/tickets" className="back-link">← Back to tickets</Link>
      {location.state?.created === true && (
        <div className="form-success" role="status">Ticket created successfully.</div>
      )}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Ticket {ticket.id}</p>
          <h1>{ticket.subject}</h1>
        </div>
        {isStaff && (
          <div className="ticket-controls">
            <label className="status-control">
              Update status
              <select
                value={ticket.status}
                disabled={updateMutation.isPending}
                onChange={(event) => {
                  const status = ticketStatusOptions.find((option) => option.value === event.target.value)?.value;
                  if (status) void changeStatus(status);
                }}
              >
                {ticketStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {isAdmin && (
              <>
                <label className="status-control">
                  Set category
                  <select
                    value={ticket.category ?? ""}
                    disabled={updateMutation.isPending}
                    onChange={(event) => void changeCategory(event.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {ticket.category && !ticketCategorySchema.safeParse(ticket.category).success && (
                      <option value={ticket.category}>{ticket.category}</option>
                    )}
                    {ticketCategorySchema.options.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="status-control">
                  Assign to agent
                  <select
                    value={ticket.assigneeId ?? ""}
                    disabled={updateMutation.isPending || agentsQuery.isPending || Boolean(agentsQuery.error)}
                    onChange={(event) => void changeAssignee(event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {agentsQuery.data?.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        )}
      </div>

      {statusError && <div className="form-error" role="alert">{statusError}</div>}
      {adminError && <div className="form-error" role="alert">{adminError}</div>}
      {agentsQuery.error && (
        <div className="form-error" role="alert">
          {agentsQuery.error instanceof Error ? agentsQuery.error.message : "Unable to load agents."}
        </div>
      )}
      {updateMutation.isPending && <div role="status">Updating ticket…</div>}
      {isStaff && (
        <div className="categorize-actions">
          <Button
            variant="secondary"
            loading={isCategorizing}
            onClick={() => void requestCategorization()}
          >
            {isCategorizing ? "Categorizing…" : "Auto-categorize"}
          </Button>
          {categoryError && <div className="form-error" role="alert">{categoryError}</div>}
        </div>
      )}

      <article className="ticket-detail-card">
        <div className="ticket-detail-badges">
          <TicketStatusBadge status={ticket.status} />
          <Badge type="priority" value={ticket.priority} />
        </div>
        <dl className="ticket-metadata">
          <div><dt>Requester</dt><dd>{ticket.requesterEmail}</dd></div>
          <div><dt>Created</dt><dd>{new Date(ticket.createdAt).toLocaleString()}</dd></div>
          <div><dt>Last updated</dt><dd>{new Date(ticket.updatedAt).toLocaleString()}</dd></div>
          {ticket.assigneeId && <div><dt>Assignee</dt><dd>{ticket.assigneeId}</dd></div>}
          {ticket.category && <div><dt>Category</dt><dd>{ticket.category}</dd></div>}
        </dl>
        <h2>Description</h2>
        <p className="ticket-description">{ticket.description}</p>
      </article>
      {categorySuggestion && (
        <section className="categorization-card" aria-labelledby="categorization-heading">
          <div>
            <p className="eyebrow">AI suggestion</p>
            <h2 id="categorization-heading">Suggested category and priority</h2>
          </div>
          <dl className="categorization-values">
            <div>
              <dt>Category</dt>
              <dd>
                <select
                  aria-label="Suggested category"
                  value={categorySuggestion.category}
                  onChange={(event) => changeSuggestedCategory(event.target.value)}
                >
                  {ticketCategorySchema.options.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>
                <select
                  aria-label="Suggested priority"
                  value={categorySuggestion.priority}
                  onChange={(event) => changeSuggestedPriority(event.target.value)}
                >
                  {ticketPriorities.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </dd>
            </div>
          </dl>
          <p className="suggest-reply-note">Review before applying. Nothing changes until you apply this suggestion.</p>
          <div className="categorize-actions">
            <Button loading={isApplyingCategory} onClick={() => void applyCategorization()}>
              {isApplyingCategory ? "Applying…" : "Apply suggestion"}
            </Button>
            <Button
              variant="secondary"
              disabled={isApplyingCategory}
              onClick={() => setCategorySuggestion(null)}
            >
              Reject suggestion
            </Button>
          </div>
        </section>
      )}

      <section className="comments-section" aria-labelledby="comments-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2 id="comments-heading">Comments</h2>
          </div>
          {isAgent && (
            <Button
              variant="secondary"
              loading={isSuggestingReply}
              onClick={() => void requestReplySuggestion()}
            >
              {isSuggestingReply ? "Drafting reply…" : "Suggest reply"}
            </Button>
          )}
        </div>
        {commentsQuery.isPending || commentsQuery.isFetching ? (
          <div className="empty-state" role="status">Loading comments...</div>
        ) : commentsQuery.error ? (
          <div className="form-error" role="alert">{getTicketLoadError(commentsQuery.error)}</div>
        ) : (
          <CommentThread comments={commentsQuery.data ?? []} showInternal={isStaff} />
        )}
        {draftError && <div className="form-error" role="alert">{draftError}</div>}
        {!commentsQuery.error && canComment && (
          <CommentForm
            ticketId={ticket.id}
            allowInternal={isAgent}
            suggestedReply={isReviewingReply ? draftReply : null}
            suggestionPendingReview={isReviewingReply}
            isSuggestingReply={isSuggestingReply}
            onAcceptSuggestion={() => {
              setDraftReply(null);
              setIsReviewingReply(false);
            }}
            onRejectSuggestion={() => {
              setDraftReply(null);
              setIsReviewingReply(false);
            }}
          />
        )}
      </section>
    </section>
  );
}
