-- Create the todos table
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads
CREATE POLICY "anon_select_todos" ON todos
  FOR SELECT TO anon USING (true);

-- Allow anonymous inserts
CREATE POLICY "anon_insert_todos" ON todos
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous updates
CREATE POLICY "anon_update_todos" ON todos
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Allow anonymous deletes
CREATE POLICY "anon_delete_todos" ON todos
  FOR DELETE TO anon USING (true);
