-- Set 1: Tidepool. Four species for v1 (docs/03-spec-v1.md section 10).
insert into seasons (id, name, starts_at, ends_at) values
  ('S1', 'Tidepool', '2027-01-01', '2027-04-01');

insert into species (id, season_id, name, tier, art_key, sort) values
  ('otter',      'S1', 'Otter',      'common',    's1_otter',      1),
  ('hermit',     'S1', 'Hermit Crab','uncommon',  's1_hermit',     2),
  ('nudibranch', 'S1', 'Nudibranch', 'rare',      's1_nudibranch', 3),
  ('manta',      'S1', 'Manta',      'legendary', 's1_manta',      4);
