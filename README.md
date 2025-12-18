# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Supabase Edge Functions (backend)

Backend lives in `supabase/functions/`.

### Dev/Test: fixed Instagram account (no OAuth)

For debugging with a single fixed Instagram Business account/token, you can seed `connected_accounts` for the logged-in user via the `seed-test-account` Edge Function.

- Set function secrets (Supabase CLI): `supabase secrets set TEST_IG_USER_ID=... TEST_IG_ACCESS_TOKEN=... TEST_IG_USERNAME=...`
- Invoke while logged in: `supabase.functions.invoke('seed-test-account')`

### Dev/Test: auto-login (local)

For local development, you can auto-login a test user (email/password) and optionally auto-seed the fixed account on startup.

1) Create a test user (terminal; requires email confirmations disabled in Supabase Auth settings):

`curl -sS -X POST "$VITE_SUPABASE_URL/auth/v1/signup" -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"strong-password"}'`

2) Create `./.env.local` (do NOT commit):

`VITE_DEV_TEST_EMAIL=test@example.com`

`VITE_DEV_TEST_PASSWORD=strong-password`

`VITE_DEV_SEED_TEST_ACCOUNT=true`

3) Run the app: `npm run dev`
