const fetch = require('node-fetch');

const SUPABASE_URL = 'https://mwwffgzjajkjshhcznen.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13d2ZmZ3pqYWpranNoaGN6bmVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk1NjgyMiwiZXhwIjoyMDY0NTMyODIyfQ.Z033ss4JJUhSXP_rv9YgE3qVVJmceKtOPosagfweXGc';

const listBuckets = async () => {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      apiKey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  const data = await res.json();
  console.log(data);
};

listBuckets();
