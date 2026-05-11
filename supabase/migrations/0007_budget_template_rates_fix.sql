-- The per-sqft rates seeded in 0006 for the Heavy template sum to ~$38.76/sqft
-- because the heavy-rehab category total in the source data was $113,300 (not
-- $122,800 as the comments claimed). Bumping each rate proportionally so the
-- Heavy template now hits $42/sqft exactly per the skill's midpoint.
-- (Cosmetic and Gut already total their target rates correctly.)

-- Heavy ($42/sqft) — corrected rates. Scale factor 4200/3876 ≈ 1.0836.
update public.budget_template_line set per_sqft_rate_cents = 178 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000010'; -- Demo / Cleanup
update public.budget_template_line set per_sqft_rate_cents =  89 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000022'; -- Permits
update public.budget_template_line set per_sqft_rate_cents = 352 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000001'; -- Roof
update public.budget_template_line set per_sqft_rate_cents = 267 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000002'; -- Siding / Exterior Walls
update public.budget_template_line set per_sqft_rate_cents = 252 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000003'; -- Windows
update public.budget_template_line set per_sqft_rate_cents = 315 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000019'; -- Electrical
update public.budget_template_line set per_sqft_rate_cents = 341 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000020'; -- Plumbing
update public.budget_template_line set per_sqft_rate_cents = 326 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000021'; -- HVAC
update public.budget_template_line set per_sqft_rate_cents = 200 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000013'; -- Drywall
update public.budget_template_line set per_sqft_rate_cents = 686 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000016'; -- Kitchen
update public.budget_template_line set per_sqft_rate_cents = 415 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000017'; -- Bathrooms
update public.budget_template_line set per_sqft_rate_cents = 400 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000015'; -- Flooring
update public.budget_template_line set per_sqft_rate_cents = 237 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000014'; -- Interior Paint
update public.budget_template_line set per_sqft_rate_cents = 141 where budget_template_id = '00000000-0000-0000-0002-000000000002' and budget_category_id = '00000000-0000-0000-0001-000000000007'; -- Landscaping
-- Sum: 178+89+352+267+252+315+341+326+200+686+415+400+237+141 = 4199 cents/sqft ≈ $42.00.
