-- FlightForge domain-complete D1 foundation.
-- Live application repositories currently use identity, profile, privacy, course,
-- favorite, claim, import, rate-limit, and audit tables. Remaining tables are
-- deliberately schema-ready behind disabled feature flags.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL,
  organization_type TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_unique ON organizations(slug);
CREATE TABLE IF NOT EXISTS organization_memberships (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', permissions_json TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS organization_memberships_scope_unique ON organization_memberships(organization_id, user_id);

CREATE TABLE IF NOT EXISTS player_connections (
  id TEXT PRIMARY KEY NOT NULL, requester_user_id TEXT NOT NULL, addressee_user_id TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS player_connections_pair_unique ON player_connections(requester_user_id, addressee_user_id);
CREATE TABLE IF NOT EXISTS blocked_users (
  id TEXT PRIMARY KEY NOT NULL, blocker_user_id TEXT NOT NULL, blocked_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS blocked_users_pair_unique ON blocked_users(blocker_user_id, blocked_user_id);
CREATE TABLE IF NOT EXISTS player_availability (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
  recurrence_json TEXT, visibility TEXT NOT NULL DEFAULT 'PRIVATE', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS course_contacts (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, contact_type TEXT NOT NULL,
  label TEXT, value TEXT NOT NULL, is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS course_contacts_course_idx ON course_contacts(course_id);
CREATE TABLE IF NOT EXISTS course_amenities (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, amenity_code TEXT NOT NULL,
  details TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS course_amenities_course_code_unique ON course_amenities(course_id, amenity_code);
CREATE TABLE IF NOT EXISTS course_hours (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, day_of_week INTEGER NOT NULL,
  opens_at TEXT, closes_at TEXT, is_closed INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT, effective_to TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS course_seasons (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, name TEXT NOT NULL,
  starts_on TEXT, ends_on TEXT, operating_status TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS course_conditions (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, status TEXT NOT NULL,
  condition_codes_json TEXT, note TEXT, source_type TEXT NOT NULL, source_user_id TEXT,
  observed_at TEXT NOT NULL, expires_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS course_conditions_course_observed_idx ON course_conditions(course_id, observed_at);
CREATE TABLE IF NOT EXISTS course_layouts (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL,
  hole_count INTEGER NOT NULL, par INTEGER, distance_feet INTEGER, difficulty TEXT,
  is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS course_layouts_course_slug_unique ON course_layouts(course_id, slug);
CREATE TABLE IF NOT EXISTS holes (
  id TEXT PRIMARY KEY NOT NULL, layout_id TEXT NOT NULL, hole_number INTEGER NOT NULL,
  name TEXT, par INTEGER NOT NULL, distance_feet INTEGER, elevation_change_feet INTEGER,
  notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS holes_layout_number_unique ON holes(layout_id, hole_number);
CREATE TABLE IF NOT EXISTS tees (
  id TEXT PRIMARY KEY NOT NULL, hole_id TEXT NOT NULL, label TEXT NOT NULL,
  latitude TEXT, longitude TEXT, surface TEXT, distance_feet INTEGER,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS baskets (
  id TEXT PRIMARY KEY NOT NULL, hole_id TEXT NOT NULL, label TEXT NOT NULL,
  latitude TEXT, longitude TEXT, position_code TEXT, is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hazards (
  id TEXT PRIMARY KEY NOT NULL, hole_id TEXT, course_id TEXT NOT NULL, hazard_type TEXT NOT NULL,
  geometry_json TEXT NOT NULL, label TEXT, rule_note TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS course_media (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, storage_key TEXT NOT NULL,
  media_type TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'PUBLIC', alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0, created_by TEXT, created_at TEXT NOT NULL, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS course_staff (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, user_id TEXT NOT NULL,
  staff_role TEXT NOT NULL, permissions_json TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS course_staff_course_user_unique ON course_staff(course_id, user_id);

CREATE TABLE IF NOT EXISTS availability_rules (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, layout_id TEXT,
  name TEXT NOT NULL, timezone TEXT NOT NULL, rule_json TEXT NOT NULL,
  effective_from TEXT, effective_to TEXT, enabled INTEGER NOT NULL DEFAULT 1,
  created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS booking_slots (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, layout_id TEXT,
  starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, capacity INTEGER NOT NULL,
  reserved_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'OPEN',
  price_from_cents INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_slots_layout_start_unique ON booking_slots(layout_id, starts_at);
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, name TEXT NOT NULL,
  policy_json TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY NOT NULL, booking_slot_id TEXT NOT NULL, booking_owner_user_id TEXT NOT NULL,
  confirmation_code TEXT NOT NULL, status TEXT NOT NULL, party_size INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE', price_quote_id TEXT, total_cents INTEGER NOT NULL DEFAULT 0,
  cancellation_policy_id TEXT, idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_idempotency_unique ON reservations(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_confirmation_unique ON reservations(confirmation_code);
CREATE TABLE IF NOT EXISTS reservation_players (
  id TEXT PRIMARY KEY NOT NULL, reservation_id TEXT NOT NULL, user_id TEXT,
  guest_name TEXT, status TEXT NOT NULL DEFAULT 'INVITED', payment_responsibility_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY NOT NULL, reservation_id TEXT, public_game_id TEXT,
  inviter_user_id TEXT NOT NULL, invitee_user_id TEXT, invitee_email TEXT,
  token_hash TEXT, status TEXT NOT NULL, expires_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id TEXT PRIMARY KEY NOT NULL, booking_slot_id TEXT NOT NULL, user_id TEXT NOT NULL,
  party_size INTEGER NOT NULL, priority INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL,
  promoted_at TEXT, acceptance_deadline_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS check_ins (
  id TEXT PRIMARY KEY NOT NULL, reservation_id TEXT NOT NULL, user_id TEXT,
  checked_in_by TEXT NOT NULL, checked_in_at TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_rules (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, name TEXT NOT NULL,
  priority INTEGER NOT NULL, conditions_json TEXT NOT NULL, adjustment_type TEXT NOT NULL,
  adjustment_value INTEGER NOT NULL, minimum_price_cents INTEGER, maximum_price_cents INTEGER,
  effective_from TEXT, effective_to TEXT, enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS price_overrides (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, booking_slot_id TEXT,
  amount_cents INTEGER NOT NULL, reason TEXT NOT NULL, starts_at TEXT, ends_at TEXT,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS price_quotes (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, booking_slot_id TEXT,
  user_id TEXT, currency TEXT NOT NULL DEFAULT 'USD', subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL DEFAULT 0, fee_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL, breakdown_json TEXT NOT NULL, expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT, code TEXT NOT NULL,
  rules_json TEXT NOT NULL, redemption_limit INTEGER, redemption_count INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT, ends_at TEXT, enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_org_code_unique ON promo_codes(organization_id, code);
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
  membership_type TEXT NOT NULL, status TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT,
  benefits_json TEXT, provider_subscription_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS passes (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
  pass_type TEXT NOT NULL, remaining_uses INTEGER, starts_at TEXT NOT NULL, expires_at TEXT,
  status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_customers (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, provider TEXT NOT NULL,
  provider_customer_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_customers_provider_unique ON payment_customers(provider, provider_customer_id);
CREATE TABLE IF NOT EXISTS payment_accounts (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL, status TEXT NOT NULL, capabilities_json TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT, organization_id TEXT,
  reference_type TEXT NOT NULL, reference_id TEXT NOT NULL, provider TEXT NOT NULL,
  provider_payment_id TEXT, status TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  amount_cents INTEGER NOT NULL, captured_cents INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_idempotency_unique ON payment_transactions(idempotency_key);
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY NOT NULL, payment_transaction_id TEXT NOT NULL,
  provider_refund_id TEXT, status TEXT NOT NULL, amount_cents INTEGER NOT NULL,
  reason TEXT, idempotency_key TEXT NOT NULL, created_by TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS refunds_idempotency_unique ON refunds(idempotency_key);
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY NOT NULL, payment_account_id TEXT NOT NULL, provider_payout_id TEXT,
  status TEXT NOT NULL, amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  period_start TEXT, period_end TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY NOT NULL, payment_transaction_id TEXT NOT NULL, provider_dispute_id TEXT,
  status TEXT NOT NULL, amount_cents INTEGER NOT NULL, reason TEXT,
  evidence_due_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY NOT NULL, provider TEXT NOT NULL, provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL, payload_hash TEXT NOT NULL, status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, processed_at TEXT, failure_reason TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_unique ON webhook_events(provider, provider_event_id);

CREATE TABLE IF NOT EXISTS public_games (
  id TEXT PRIMARY KEY NOT NULL, host_user_id TEXT NOT NULL, course_id TEXT NOT NULL,
  reservation_id TEXT, layout_id TEXT, starts_at TEXT NOT NULL, capacity INTEGER NOT NULL,
  visibility TEXT NOT NULL, join_approval_required INTEGER NOT NULL DEFAULT 0,
  preferences_json TEXT, notes TEXT, status TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS game_join_requests (
  id TEXT PRIMARY KEY NOT NULL, public_game_id TEXT NOT NULL, user_id TEXT NOT NULL,
  status TEXT NOT NULL, message TEXT, decided_by TEXT, decided_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS game_join_requests_game_user_unique ON game_join_requests(public_game_id, user_id);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL, conversation_type TEXT NOT NULL, subject TEXT,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversation_members (
  id TEXT PRIMARY KEY NOT NULL, conversation_id TEXT NOT NULL, user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL, left_at TEXT, last_read_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS conversation_members_unique ON conversation_members(conversation_id, user_id);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL, conversation_id TEXT NOT NULL, sender_user_id TEXT NOT NULL,
  body TEXT NOT NULL, moderation_status TEXT NOT NULL DEFAULT 'CLEAR',
  created_at TEXT NOT NULL, edited_at TEXT, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY NOT NULL, follower_user_id TEXT NOT NULL,
  target_type TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS follows_target_unique ON follows(follower_user_id, target_type, target_id);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY NOT NULL, reporter_user_id TEXT NOT NULL, target_type TEXT NOT NULL,
  target_id TEXT NOT NULL, category TEXT NOT NULL, details TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY NOT NULL, report_id TEXT, moderator_user_id TEXT NOT NULL,
  action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
  reason TEXT NOT NULL, metadata_json TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, layout_id TEXT,
  created_by TEXT NOT NULL, status TEXT NOT NULL, scoring_format TEXT NOT NULL,
  started_at TEXT, completed_at TEXT, client_sync_id TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS round_players (
  id TEXT PRIMARY KEY NOT NULL, round_id TEXT NOT NULL, user_id TEXT,
  guest_name TEXT, team_code TEXT, starting_position INTEGER,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scorecards (
  id TEXT PRIMARY KEY NOT NULL, round_id TEXT NOT NULL, round_player_id TEXT NOT NULL,
  total_score INTEGER, score_relative_to_par INTEGER, verification_type TEXT NOT NULL DEFAULT 'APP_RECORDED',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS hole_scores (
  id TEXT PRIMARY KEY NOT NULL, scorecard_id TEXT NOT NULL, hole_id TEXT,
  hole_number INTEGER NOT NULL, strokes INTEGER NOT NULL, penalties INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT, client_mutation_id TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS hole_scores_client_mutation_unique ON hole_scores(client_mutation_id);
CREATE TABLE IF NOT EXISTS throws (
  id TEXT PRIMARY KEY NOT NULL, hole_score_id TEXT NOT NULL, sequence_number INTEGER NOT NULL,
  player_disc_id TEXT, shot_type TEXT, result TEXT, distance_feet INTEGER,
  latitude TEXT, longitude TEXT, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS penalties (
  id TEXT PRIMARY KEY NOT NULL, hole_score_id TEXT NOT NULL, penalty_type TEXT NOT NULL,
  strokes INTEGER NOT NULL, note TEXT, assessed_by TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS round_weather_snapshots (
  id TEXT PRIMARY KEY NOT NULL, round_id TEXT NOT NULL, provider TEXT NOT NULL,
  observed_at TEXT NOT NULL, weather_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS round_condition_snapshots (
  id TEXT PRIMARY KEY NOT NULL, round_id TEXT NOT NULL, source_type TEXT NOT NULL,
  observed_at TEXT NOT NULL, conditions_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS player_stat_snapshots (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, period_type TEXT NOT NULL,
  period_start TEXT, period_end TEXT, metrics_json TEXT NOT NULL,
  source_label TEXT NOT NULL, calculated_at TEXT NOT NULL, calculation_version TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rating_calculation_versions (
  id TEXT PRIMARY KEY NOT NULL, version_code TEXT NOT NULL, description TEXT NOT NULL,
  formula_json TEXT NOT NULL, effective_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS rating_versions_code_unique ON rating_calculation_versions(version_code);
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, rating_type TEXT NOT NULL,
  value INTEGER NOT NULL, calculation_version_id TEXT, source_round_count INTEGER,
  calculated_at TEXT NOT NULL, valid_until TEXT, metadata_json TEXT
);
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, achievement_code TEXT NOT NULL,
  evidence_json TEXT, awarded_at TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'PUBLIC'
);

CREATE TABLE IF NOT EXISTS manufacturers (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL,
  website TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS manufacturers_slug_unique ON manufacturers(slug);
CREATE TABLE IF NOT EXISTS disc_molds (
  id TEXT PRIMARY KEY NOT NULL, manufacturer_id TEXT NOT NULL, name TEXT NOT NULL,
  category TEXT NOT NULL, speed TEXT, glide TEXT, turn TEXT, fade TEXT,
  approved_reference TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS disc_molds_manufacturer_name_unique ON disc_molds(manufacturer_id, name);
CREATE TABLE IF NOT EXISTS disc_variants (
  id TEXT PRIMARY KEY NOT NULL, disc_mold_id TEXT NOT NULL, plastic TEXT,
  weight_grams INTEGER, color TEXT, stability TEXT, catalog_metadata_json TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS player_discs (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, disc_variant_id TEXT,
  manufacturer_name TEXT, mold_name TEXT NOT NULL, plastic TEXT, weight_grams INTEGER,
  color TEXT, nickname TEXT, condition TEXT, status TEXT NOT NULL DEFAULT 'IN_BAG',
  purchase_date TEXT, purchase_price_cents INTEGER, photo_key TEXT, notes TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS bags (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL,
  bag_type TEXT NOT NULL DEFAULT 'PRIMARY', is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bag_slots (
  id TEXT PRIMARY KEY NOT NULL, bag_id TEXT NOT NULL, player_disc_id TEXT NOT NULL,
  category TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS bag_slots_bag_disc_unique ON bag_slots(bag_id, player_disc_id);
CREATE TABLE IF NOT EXISTS retailer_products (
  id TEXT PRIMARY KEY NOT NULL, retailer_code TEXT NOT NULL, external_product_id TEXT NOT NULL,
  disc_mold_id TEXT, title TEXT NOT NULL, product_url TEXT NOT NULL,
  affiliate_disclosure TEXT, last_synced_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS retailer_offers (
  id TEXT PRIMARY KEY NOT NULL, retailer_product_id TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  price_cents INTEGER, availability TEXT NOT NULL, observed_at TEXT NOT NULL, expires_at TEXT
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT, director_user_id TEXT NOT NULL,
  course_id TEXT NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT,
  starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, registration_opens_at TEXT,
  registration_closes_at TEXT, capacity INTEGER, status TEXT NOT NULL,
  format_json TEXT NOT NULL, policy_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS tournaments_slug_unique ON tournaments(slug);
CREATE TABLE IF NOT EXISTS tournament_divisions (
  id TEXT PRIMARY KEY NOT NULL, tournament_id TEXT NOT NULL, code TEXT NOT NULL,
  name TEXT NOT NULL, capacity INTEGER, entry_fee_cents INTEGER NOT NULL DEFAULT 0,
  eligibility_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id TEXT PRIMARY KEY NOT NULL, tournament_id TEXT NOT NULL, division_id TEXT,
  user_id TEXT, team_name TEXT, status TEXT NOT NULL, payment_transaction_id TEXT,
  answers_json TEXT, waiver_version TEXT, idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tournament_registrations_idempotency_unique ON tournament_registrations(idempotency_key);
CREATE TABLE IF NOT EXISTS tournament_rounds (
  id TEXT PRIMARY KEY NOT NULL, tournament_id TEXT NOT NULL, course_layout_id TEXT,
  round_number INTEGER NOT NULL, starts_at TEXT, status TEXT NOT NULL,
  configuration_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tournament_groups (
  id TEXT PRIMARY KEY NOT NULL, tournament_round_id TEXT NOT NULL, label TEXT NOT NULL,
  starting_hole INTEGER, tee_time TEXT, assignments_json TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tournament_results (
  id TEXT PRIMARY KEY NOT NULL, tournament_id TEXT NOT NULL, registration_id TEXT NOT NULL,
  division_id TEXT, position INTEGER, total_score INTEGER, status TEXT NOT NULL,
  tie_break_json TEXT, verified_by TEXT, published_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT, administrator_user_id TEXT NOT NULL,
  name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT, home_course_id TEXT,
  season_start TEXT, season_end TEXT, status TEXT NOT NULL, privacy TEXT NOT NULL,
  rules_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS leagues_slug_unique ON leagues(slug);
CREATE TABLE IF NOT EXISTS league_courses (
  id TEXT PRIMARY KEY NOT NULL, league_id TEXT NOT NULL, course_id TEXT NOT NULL,
  status TEXT NOT NULL, invited_at TEXT, accepted_at TEXT, left_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS league_courses_unique ON league_courses(league_id, course_id);
CREATE TABLE IF NOT EXISTS league_members (
  id TEXT PRIMARY KEY NOT NULL, league_id TEXT NOT NULL, user_id TEXT NOT NULL,
  division_code TEXT, status TEXT NOT NULL, handicap_value TEXT,
  joined_at TEXT NOT NULL, left_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS league_members_unique ON league_members(league_id, user_id);
CREATE TABLE IF NOT EXISTS league_events (
  id TEXT PRIMARY KEY NOT NULL, league_id TEXT NOT NULL, course_id TEXT NOT NULL,
  layout_id TEXT, starts_at TEXT NOT NULL, status TEXT NOT NULL,
  configuration_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS league_results (
  id TEXT PRIMARY KEY NOT NULL, league_event_id TEXT NOT NULL, league_member_id TEXT NOT NULL,
  score INTEGER, points TEXT, placement INTEGER, verification_type TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS league_standings (
  id TEXT PRIMARY KEY NOT NULL, league_id TEXT NOT NULL, league_member_id TEXT NOT NULL,
  rank INTEGER, points TEXT NOT NULL, metrics_json TEXT, calculated_at TEXT NOT NULL,
  calculation_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_sessions (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, feature TEXT NOT NULL,
  provider TEXT, model_version TEXT, prompt_version TEXT, output_schema_version TEXT,
  status TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT,
  latency_ms INTEGER, usage_json TEXT, cost_micros INTEGER, safety_result TEXT, failure_reason TEXT
);
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id TEXT PRIMARY KEY NOT NULL, ai_session_id TEXT NOT NULL, user_id TEXT NOT NULL,
  recommendation_type TEXT NOT NULL, input_summary_json TEXT NOT NULL,
  output_json TEXT NOT NULL, confidence TEXT, created_at TEXT NOT NULL, expires_at TEXT
);
CREATE TABLE IF NOT EXISTS ai_feedback (
  id TEXT PRIMARY KEY NOT NULL, ai_recommendation_id TEXT NOT NULL, user_id TEXT NOT NULL,
  rating TEXT, correction_json TEXT, comment TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media_uploads (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, storage_key TEXT NOT NULL,
  media_type TEXT NOT NULL, mime_type TEXT NOT NULL, byte_size INTEGER NOT NULL,
  duration_ms INTEGER, width INTEGER, height INTEGER, status TEXT NOT NULL,
  metadata_stripped INTEGER NOT NULL DEFAULT 0, expires_at TEXT, created_at TEXT NOT NULL, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS media_analysis_jobs (
  id TEXT PRIMARY KEY NOT NULL, media_upload_id TEXT NOT NULL, user_id TEXT NOT NULL,
  analysis_type TEXT NOT NULL, input_context_json TEXT NOT NULL,
  status TEXT NOT NULL, idempotency_key TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT, failure_reason TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS media_analysis_jobs_idempotency_unique ON media_analysis_jobs(idempotency_key);
CREATE TABLE IF NOT EXISTS media_analysis_results (
  id TEXT PRIMARY KEY NOT NULL, media_analysis_job_id TEXT NOT NULL,
  output_json TEXT NOT NULL, confidence TEXT, limitations_json TEXT,
  model_version_id TEXT, prompt_version_id TEXT, created_at TEXT NOT NULL, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS model_versions (
  id TEXT PRIMARY KEY NOT NULL, provider TEXT NOT NULL, model_name TEXT NOT NULL,
  version TEXT NOT NULL, capabilities_json TEXT, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY NOT NULL, feature TEXT NOT NULL, version TEXT NOT NULL,
  template_hash TEXT NOT NULL, output_schema_version TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tutorials (
  id TEXT PRIMARY KEY NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL, summary TEXT,
  level TEXT NOT NULL, content_type TEXT NOT NULL, status TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1, author_user_id TEXT, reviewer_user_id TEXT,
  published_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS tutorials_slug_unique ON tutorials(slug);
CREATE TABLE IF NOT EXISTS tutorial_modules (
  id TEXT PRIMARY KEY NOT NULL, tutorial_id TEXT NOT NULL, title TEXT NOT NULL,
  sort_order INTEGER NOT NULL, content_json TEXT NOT NULL, version INTEGER NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tutorial_progress (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, tutorial_id TEXT NOT NULL,
  status TEXT NOT NULL, progress_percent INTEGER NOT NULL DEFAULT 0,
  started_at TEXT, completed_at TEXT, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tutorial_progress_unique ON tutorial_progress(user_id, tutorial_id);
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY NOT NULL, tutorial_module_id TEXT NOT NULL, title TEXT NOT NULL,
  questions_json TEXT NOT NULL, passing_score INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY NOT NULL, quiz_id TEXT NOT NULL, user_id TEXT NOT NULL,
  answers_json TEXT NOT NULL, score INTEGER, passed INTEGER,
  started_at TEXT NOT NULL, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS drills (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, level TEXT NOT NULL,
  instructions_json TEXT NOT NULL, safety_note TEXT, status TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS practice_plans (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, title TEXT NOT NULL,
  plan_json TEXT NOT NULL, generated_by_ai INTEGER NOT NULL DEFAULT 0,
  starts_on TEXT, ends_on TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, user_id TEXT NOT NULL,
  reservation_id TEXT, round_id TEXT, ratings_json TEXT NOT NULL, body TEXT,
  verification_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PUBLISHED',
  owner_response TEXT, owner_responded_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_course_user_unique ON reviews(course_id, user_id);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, category TEXT NOT NULL,
  channel TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  action_url TEXT, status TEXT NOT NULL DEFAULT 'PENDING', scheduled_at TEXT,
  sent_at TEXT, read_at TEXT, dedupe_key TEXT, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_unique ON notifications(dedupe_key);
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, category TEXT NOT NULL,
  in_app_enabled INTEGER NOT NULL DEFAULT 1, email_enabled INTEGER NOT NULL DEFAULT 1,
  push_enabled INTEGER NOT NULL DEFAULT 0, quiet_hours_json TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_unique ON notification_preferences(user_id, category);

CREATE TABLE IF NOT EXISTS commerce_products (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, product_type TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT, currency TEXT NOT NULL DEFAULT 'USD',
  price_cents INTEGER NOT NULL, inventory_quantity INTEGER, status TEXT NOT NULL,
  metadata_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS commerce_orders (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
  order_type TEXT NOT NULL, status TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL, tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL, payment_transaction_id TEXT, fulfillment_json TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS commerce_order_items (
  id TEXT PRIMARY KEY NOT NULL, order_id TEXT NOT NULL, product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL, total_cents INTEGER NOT NULL,
  metadata_json TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY NOT NULL, instructor_user_id TEXT NOT NULL, organization_id TEXT,
  title TEXT NOT NULL, lesson_type TEXT NOT NULL, duration_minutes INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1, price_cents INTEGER NOT NULL,
  availability_json TEXT NOT NULL, cancellation_policy_id TEXT,
  status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weather_observations (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL, provider TEXT NOT NULL,
  observation_type TEXT NOT NULL, observed_at TEXT NOT NULL, weather_json TEXT NOT NULL,
  expires_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY NOT NULL, description TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0, rules_json TEXT,
  updated_at TEXT NOT NULL, updated_by TEXT
);
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY NOT NULL, value_json TEXT NOT NULL, is_secret INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL, updated_by TEXT
);
CREATE TABLE IF NOT EXISTS import_records (
  id TEXT PRIMARY KEY NOT NULL, batch_id TEXT NOT NULL, row_number INTEGER NOT NULL,
  external_id TEXT, normalized_name TEXT NOT NULL, payload_json TEXT NOT NULL,
  matched_course_id TEXT, review_status TEXT NOT NULL DEFAULT 'PENDING',
  validation_errors_json TEXT, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS import_records_batch_row_unique ON import_records(batch_id, row_number);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL, actor_user_id TEXT, organization_id TEXT,
  action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT,
  reason TEXT, request_id TEXT, metadata_json TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs(resource_type, resource_id);
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT, anonymous_id TEXT,
  event_name TEXT NOT NULL, properties_json TEXT, consent_scope TEXT,
  occurred_at TEXT NOT NULL, received_at TEXT NOT NULL
);
