import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// All app data lives in a single "records" table:
//   id uuid, user_id uuid, entity text, created_date, updated_date, data jsonb
// RLS restricts every row to its owner, so list/filter are already user-scoped.

const rowToObj = (row) => ({
  ...row.data,
  id: row.id,
  created_date: row.created_date,
  updated_date: row.updated_date,
});

const TIMESTAMP_FIELDS = ['created_date', 'updated_date'];

function applySort(query, sort) {
  if (!sort) return query.order('created_date', { ascending: false });
  const ascending = !sort.startsWith('-');
  const field = ascending ? sort : sort.slice(1);
  return TIMESTAMP_FIELDS.includes(field)
    ? query.order(field, { ascending })
    : query.order(`data->>${field}`, { ascending });
}

async function currentUserEmail() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email ?? null;
}

function makeEntity(entityName) {
  const baseSelect = () => supabase.from('records').select('*').eq('entity', entityName);

  return {
    async list(sort, limit) {
      let query = applySort(baseSelect(), sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data.map(rowToObj);
    },

    async filter(filters = {}, sort, limit) {
      let query = baseSelect();
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined) continue;
        query = TIMESTAMP_FIELDS.includes(key) || key === 'id'
          ? query.eq(key, value)
          : query.eq(`data->>${key}`, String(value));
      }
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data.map(rowToObj);
    },

    async create(payload) {
      const email = await currentUserEmail();
      const { data, error } = await supabase
        .from('records')
        .insert({ entity: entityName, data: { created_by: email, ...payload } })
        .select()
        .single();
      if (error) throw error;
      return rowToObj(data);
    },

    async bulkCreate(payloads) {
      const email = await currentUserEmail();
      const rows = payloads.map((payload) => ({
        entity: entityName,
        data: { created_by: email, ...payload },
      }));
      const { data, error } = await supabase.from('records').insert(rows).select();
      if (error) throw error;
      return data.map(rowToObj);
    },

    async update(id, payload) {
      const { data: existing, error: fetchError } = await supabase
        .from('records')
        .select('data')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      const { data, error } = await supabase
        .from('records')
        .update({ data: { ...existing.data, ...payload }, updated_date: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return rowToObj(data);
    },

    async delete(id) {
      const { error } = await supabase.from('records').delete().eq('id', id);
      if (error) throw error;
      return { id };
    },
  };
}

const sessionUserToMe = (user) => ({
  id: user.id,
  email: user.email,
  full_name:
    user.user_metadata?.full_name || user.user_metadata?.name || user.email,
  avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
});

const auth = {
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  async me() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const error = new Error('Not authenticated');
      error.status = 401;
      throw error;
    }
    return sessionUserToMe(data.session.user);
  },

  async redirectToLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.assign('/');
  },
};

// CSV import replaces Base44's hosted UploadFile + ExtractDataFromUploadedFile.
// Files never leave the browser: UploadFile keeps the File in memory and
// ExtractDataFromUploadedFile parses it as CSV client-side.
const uploadedFiles = new Map();
let uploadCounter = 0;

const POSITION_ALIASES = {
  gk: 'goalkeeper', goalkeeper: 'goalkeeper', goalie: 'goalkeeper',
  d: 'defender', def: 'defender', defender: 'defender', defense: 'defender', back: 'defender',
  m: 'midfielder', mid: 'midfielder', midfielder: 'midfielder', midfield: 'midfielder',
  s: 'striker', st: 'striker', striker: 'striker', forward: 'striker', attacker: 'striker', fw: 'striker',
};

const normalizePosition = (raw) => POSITION_ALIASES[String(raw).trim().toLowerCase()] || null;

const TRUTHY = new Set(['true', 'yes', '1', 'y']);

function rowToPlayer(row) {
  const get = (...names) => {
    for (const key of Object.keys(row)) {
      if (names.includes(key.trim().toLowerCase().replace(/[\s_-]+/g, '_'))) {
        return row[key];
      }
    }
    return undefined;
  };

  const name = get('name', 'player', 'player_name', 'full_name');
  if (!name || !String(name).trim()) return null;

  const ratingRaw = get('skill_rating', 'rating', 'skill', 'stars', 'level');
  const rating = ratingRaw !== undefined && ratingRaw !== '' ? Number(ratingRaw) : null;

  const positionsRaw = get('positions', 'position', 'pos', 'role', 'roles');
  const positions = positionsRaw
    ? String(positionsRaw)
        .split(/[;,/|]/)
        .map(normalizePosition)
        .filter(Boolean)
    : [];

  const unknownRaw = get('is_unknown', 'unknown', 'guest');
  const is_unknown = unknownRaw !== undefined
    ? TRUTHY.has(String(unknownRaw).trim().toLowerCase())
    : false;

  return {
    name: String(name).trim(),
    skill_rating: Number.isFinite(rating) ? rating : null,
    positions,
    is_unknown,
  };
}

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const id = `upload-${++uploadCounter}`;
      uploadedFiles.set(id, file);
      return { file_url: id };
    },

    async ExtractDataFromUploadedFile({ file_url }) {
      const file = uploadedFiles.get(file_url);
      if (!file) {
        return { status: 'error', details: 'Uploaded file not found' };
      }
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors.length && parsed.data.length === 0) {
        return {
          status: 'error',
          details: `Could not parse file as CSV: ${parsed.errors[0].message}`,
        };
      }
      const players = parsed.data.map(rowToPlayer).filter(Boolean);
      if (players.length === 0) {
        return {
          status: 'error',
          details: 'No players found. The CSV needs a "name" column, plus optional "skill_rating" and "positions" columns.',
        };
      }
      return { status: 'success', output: { players } };
    },
  },
};

export const client = {
  entities: {
    Game: makeEntity('Game'),
    Player: makeEntity('Player'),
    Match: makeEntity('Match'),
  },
  auth,
  integrations,
  // Base44 logged page navigations server-side; we don't need that.
  appLogs: { logUserInApp: async () => {} },
};
