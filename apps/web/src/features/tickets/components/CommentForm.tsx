import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { createCommentSchema, type CreateCommentInput } from "../schemas";
import { useCreateComment } from "../hooks/useTicketMutations";
import { Button } from "../../../components/ui/Button";

type CommentFormValues = z.input<typeof createCommentSchema>;

export function CommentForm({
  ticketId,
  allowInternal,
  suggestedReply = null,
  suggestionPendingReview = false,
  isSuggestingReply = false,
  onAcceptSuggestion,
  onRejectSuggestion,
}: {
  ticketId: string;
  allowInternal: boolean;
  suggestedReply?: string | null;
  suggestionPendingReview?: boolean;
  isSuggestingReply?: boolean;
  onAcceptSuggestion?: () => void;
  onRejectSuggestion?: () => void;
}) {
  const mutation = useCreateComment(ticketId);
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues, unknown, CreateCommentInput>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { body: suggestedReply ?? "", isInternal: false },
  });

  useEffect(() => {
    if (suggestedReply !== null) {
      setValue("body", suggestedReply, { shouldDirty: true });
    }
  }, [setValue, suggestedReply]);

  async function submit(input: CreateCommentInput) {
    setFormError("");
    try {
      await mutation.mutateAsync(input);
      reset({ body: "", isInternal: false });
    } catch (reason) {
      setFormError(
        reason instanceof Error ? reason.message : "Unable to add the comment.",
      );
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit(submit)} aria-busy={isSubmitting || mutation.isPending}>
      <label htmlFor="comment-body">Add a comment</label>
      <textarea
        id="comment-body"
        rows={4}
        maxLength={10_000}
        defaultValue={suggestedReply ?? ""}
        disabled={isSuggestingReply}
        aria-invalid={Boolean(errors.body)}
        aria-describedby={errors.body ? "comment-body-error" : undefined}
        {...register("body")}
      />
      {errors.body && <span id="comment-body-error" className="field-error" role="alert">{errors.body.message}</span>}
      {isSuggestingReply && <p role="status">Drafting a reply…</p>}
      {suggestionPendingReview && (
        <div className="comment-suggestion-actions">
          <p className="suggest-reply-note">
            Review and edit this AI draft. It will not be sent until you add the comment.
          </p>
          <Button type="button" onClick={onAcceptSuggestion}>Accept suggestion</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setValue("body", "", { shouldDirty: true });
              onRejectSuggestion?.();
            }}
          >
            Reject
          </Button>
        </div>
      )}
      {allowInternal && (
        <label className="checkbox-field">
          <input type="checkbox" {...register("isInternal")} />
          Internal comment
        </label>
      )}
      {formError && <div className="form-error" role="alert">{formError}</div>}
      <Button
        type="submit"
        loading={isSubmitting || mutation.isPending}
        disabled={isSuggestingReply || suggestionPendingReview}
      >
        {isSubmitting || mutation.isPending ? "Adding comment…" : "Add comment"}
      </Button>
    </form>
  );
}
