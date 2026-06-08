UPDATE conversation_messages
SET metadata = jsonb_set(
  metadata,
  '{queryPlanDag,steps}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN step->>'taskType' NOT IN ('retrieve', 'reasoning') THEN step - 'taskType'
        ELSE step
      END
      ORDER BY ordinality
    )
    FROM jsonb_array_elements(metadata #> '{queryPlanDag,steps}') WITH ORDINALITY AS items(step, ordinality)
  ),
  false
)
WHERE jsonb_typeof(metadata #> '{queryPlanDag,steps}') = 'array';

UPDATE conversation_messages
SET metadata = jsonb_set(
  metadata,
  '{stepResults}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN result->>'taskType' NOT IN ('retrieve', 'reasoning') THEN result - 'taskType'
        ELSE result
      END
      ORDER BY ordinality
    )
    FROM jsonb_array_elements(metadata -> 'stepResults') WITH ORDINALITY AS items(result, ordinality)
  ),
  false
)
WHERE jsonb_typeof(metadata -> 'stepResults') = 'array';
