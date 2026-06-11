-- Additional indexes for query performance
CREATE INDEX IF NOT EXISTS records_entity_idx ON public.records(entity);
CREATE INDEX IF NOT EXISTS records_created_date_idx ON public.records(created_date DESC);
CREATE INDEX IF NOT EXISTS records_data_game_ids_idx ON public.records USING GIN((data->'game_ids'));

-- Allow users to read games that have been shared with them
CREATE POLICY "Users can read games shared with them"
  ON public.records FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      entity = 'Game'
      AND data->'shared_with_emails' @> to_jsonb(auth.email())
    )
  );
