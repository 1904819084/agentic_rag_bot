UPDATE conversation_messages
SET metadata = jsonb_set(
  metadata - 'queryPlanDag',
  '{queryPlan}',
  jsonb_build_object(
    'tasks',
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', step->'id',
          'type', COALESCE(step->'taskType', '"retrieve"'::jsonb),
          'query', step->'query',
          'dependsOn', COALESCE(step->'depends', '[]'::jsonb)
        )
        ORDER BY ordinality
      )
      FROM jsonb_array_elements(metadata #> '{queryPlanDag,steps}') WITH ORDINALITY AS items(step, ordinality)
    )
  ),
  true
)
WHERE jsonb_typeof(metadata #> '{queryPlanDag,steps}') = 'array'
  AND metadata ? 'queryPlanDag';
