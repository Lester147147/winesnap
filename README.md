# WineSnap

Mobile-first wine identification web app. Photograph a bottle label to receive an AI-generated guide with origin, grapes, tasting notes, pairing ideas, serving guidance and an honest confidence note.

## Local run

1. Install Node.js 20+
2. Run `npm install`
3. Copy `.env.example` to `.env` and add an OpenAI API key
4. Run `npm start`
5. Open `http://localhost:3000`

## Render

The included `render.yaml` defines the service. Connect the repository in Render, choose **Blueprint**, and add `OPENAI_API_KEY` as a secret environment variable. Do not commit the key.
