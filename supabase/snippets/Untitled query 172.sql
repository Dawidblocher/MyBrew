BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "USER_A_UUID", "role": "authenticated"}';
INSERT INTO public.recipes (user_id, name, style, blg, srm, ibu, abv, data)
VALUES (
  'USER_A_UUID',
  'RLS test',
  'IPA',
  12.0, 5.0, 30.0, 5.0,
  '{"basics":{"name":"RLS test","style":"IPA"},"batch":{"volumeL":20},"malts":[],"mash":{"efficiencyPct":75,"waterToGrainRatio":3,"rests":[]},"hops":[],"yeast":{"strain":"","type":"","attenuationPct":75,"fermTempMinC":18,"fermTempMaxC":22},"adjuncts":[]}'::jsonb
);
COMMIT;