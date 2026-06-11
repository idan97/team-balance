-- Fix "permission denied for table users" by using auth.email() builtin
-- instead of a subquery on auth.users (which requires elevated grants).
DROP POLICY IF EXISTS "Users can read games shared with them" ON public.records;

CREATE POLICY "Users can read games shared with them"
  ON public.records FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      entity = 'Game'
      AND data->'shared_with_emails' @> to_jsonb(auth.email())
    )
  );
