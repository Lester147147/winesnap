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
