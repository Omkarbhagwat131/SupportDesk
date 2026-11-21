import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormSetError } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { ApiRequestError } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { useCreateTicket } from "../features/tickets/hooks/useTicketMutations";
import { createTicketSchema, type CreateTicketInput } from "../features/tickets/schemas";

const ticketFieldNames = ["subject", "requesterEmail", "description"] as const;
type TicketFieldName = (typeof ticketFieldNames)[number];

function isTicketFieldName(value: unknown): value is TicketFieldName {
  return typeof value === "string" && ticketFieldNames.some((name) => name === value);
}

function setServerFieldErrors(
  reason: unknown,
  setError: UseFormSetError<CreateTicketInput>,
): boolean {
  if (!(reason instanceof ApiRequestError) || !Array.isArray(reason.details)) return false;

  let hasFieldErrors = false;
  for (const issue of reason.details) {
    if (typeof issue !== "object" || issue === null) continue;
    const path = "path" in issue ? issue.path : undefined;
    const message = "message" in issue ? issue.message : undefined;
    const field = Array.isArray(path) ? path[0] : undefined;
    if (isTicketFieldName(field) && typeof message === "string") {
      setError(field, { type: "server", message });
      hasFieldErrors = true;
    }
  }
  return hasFieldErrors;
}

export function CreateTicketPage() {
  const navigate = useNavigate();
  const mutation = useCreateTicket();
  const user = getStoredUser();
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: "",
      requesterEmail: user?.role === "CUSTOMER" ? user.email : "",
      description: "",
    },
  });

  async function submit(input: CreateTicketInput) {
    setFormError("");
    try {
      const ticket = await mutation.mutateAsync(input);
      navigate(`/tickets/${encodeURIComponent(ticket.id)}`, {
        replace: true,
        state: { created: true },
      });
    } catch (reason) {
      if (!setServerFieldErrors(reason, setError)) {
        setFormError(reason instanceof Error ? reason.message : "Unable to create the ticket.");
      }
    }
  }

  const submitting = isSubmitting || mutation.isPending;

  return (
    <section className="ticket-form-page">
      <Link to="/tickets" className="back-link">← Back to tickets</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Support</p>
          <h1>Create ticket</h1>
        </div>
      </div>

      <form className="ticket-form" onSubmit={handleSubmit(submit)} aria-busy={submitting}>
        <label htmlFor="ticket-subject">Subject</label>
        <input
          id="ticket-subject"
          autoComplete="off"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? "ticket-subject-error" : undefined}
          {...register("subject")}
        />
        {errors.subject && <span id="ticket-subject-error" className="field-error" role="alert">{errors.subject.message}</span>}

        <label htmlFor="ticket-requester-email">Requester email</label>
        <input
          id="ticket-requester-email"
          type="email"
          autoComplete="email"
          readOnly={user?.role === "CUSTOMER"}
          aria-invalid={Boolean(errors.requesterEmail)}
          aria-describedby={errors.requesterEmail ? "ticket-requester-email-error" : undefined}
          {...register("requesterEmail")}
        />
        {errors.requesterEmail && <span id="ticket-requester-email-error" className="field-error" role="alert">{errors.requesterEmail.message}</span>}

        <label htmlFor="ticket-description">Description</label>
        <textarea
          id="ticket-description"
          rows={6}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "ticket-description-error" : undefined}
          {...register("description")}
        />
        {errors.description && <span id="ticket-description-error" className="field-error" role="alert">{errors.description.message}</span>}

        {formError && <div className="form-error" role="alert">{formError}</div>}
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Creating ticket…" : "Create ticket"}
        </button>
      </form>
    </section>
  );
}
