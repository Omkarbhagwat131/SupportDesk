import { useState } from "react";
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
}: {
  ticketId: string;
  allowInternal: boolean;
}) {
  const mutation = useCreateComment(ticketId);
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues, unknown, CreateCommentInput>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { body: "", isInternal: false },
  });

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
        aria-invalid={Boolean(errors.body)}
        aria-describedby={errors.body ? "comment-body-error" : undefined}
        {...register("body")}
      />
      {errors.body && <span id="comment-body-error" className="field-error" role="alert">{errors.body.message}</span>}
      {allowInternal && (
        <label className="checkbox-field">
          <input type="checkbox" {...register("isInternal")} />
          Internal comment
        </label>
      )}
      {formError && <div className="form-error" role="alert">{formError}</div>}
      <Button type="submit" loading={isSubmitting || mutation.isPending}>
        {isSubmitting || mutation.isPending ? "Adding comment…" : "Add comment"}
      </Button>
    </form>
  );
}
