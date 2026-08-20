# WineSnap

Mobile-first wine identification web app. Photograph a bottle label to receive an AI-generated guide with origin, grapes, tasting notes, pairing ideas, serving guidance and an honest confidence note.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Lester147147/winesnap)

## Local run

1. Install Node.js 20+
2. Run `npm install`
3. Copy `.env.example` to `.env` and add an OpenAI API key
4. Run `npm start`
5. Open `http://localhost:3000`

## Render

Click **Deploy to Render** above. The included `render.yaml` defines the service. Add `OPENAI_API_KEY` as a secret environment variable when prompted. Do not commit the key.

## Accounts and saved wines

1. Create a Supabase project.
2. In its SQL Editor, run `supabase/schema.sql` once.
3. In Authentication > URL Configuration, set the Site URL to `https://winesnap.onrender.com` and add `https://winesnap.onrender.com/**` as a redirect URL.
4. In Render, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the Supabase project API settings, then redeploy.

The anon key is designed for public clients; database access is protected by the row-level security policies in the schema. Never add the Supabase service-role key to the browser or repository.
