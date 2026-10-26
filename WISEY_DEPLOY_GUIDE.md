# Wisey deployment guide

Wisey has two parts. The rule-based Supabase workflow generates notifications and score/challenge outcomes without an AI API. The conversational assistant is optional and runs in `supabase/functions/wisey-chat/index.ts`.

## Provider setup

Gemini is the default. Groq and OpenAI-compatible selection are also supported. Set provider credentials in Supabase Function secrets, not browser environment variables.

```sh
supabase secrets set GEMINI_API_KEY=YOUR_PROVIDER_KEY WISEY_PROVIDER=gemini WISEY_MODEL=gemini-flash-lite-latest
supabase functions deploy wisey-chat
```

Alternative configuration:

```sh
supabase secrets set GROQ_API_KEY=YOUR_PROVIDER_KEY WISEY_PROVIDER=groq WISEY_MODEL=YOUR_ENABLED_GROQ_MODEL
```

or

```sh
supabase secrets set OPENAI_API_KEY=YOUR_PROVIDER_KEY WISEY_PROVIDER=openai WISEY_MODEL=gpt-4.1-mini
```

The function validates the signed-in user, checks active Wisey consent, limits usage to 20 messages per account per hour, loads only that user’s profile/finance/chat records under RLS, and sends a small account summary and the question to the configured provider. It returns a readable error if the provider is unavailable. It does not expose provider keys to the client.

## Consent and privacy

Wisey AI data sharing is optional and off by default for new accounts. The app discloses that questions and limited financial summaries go to the configured provider; users can grant or withdraw consent in Settings. Withdrawal is recorded in `consent_records`, and the Edge Function rejects further AI calls without an active consent.

The Gemini request uses `store: false`; this is a provider request setting, not a guarantee that the provider retains no data under all circumstances. Before sending real student financial information, review the selected provider’s current privacy, logging, training and retention terms and configure the project accordingly. The rule-based agent remains available when no AI provider is configured.

## Limits

- Gemini, Groq and OpenAI credentials, quotas, model availability and data terms depend on the operator’s provider account.
- In-app chat history is stored in the user’s Supabase account for the history screen.
- AI responses are educational and are not personalized regulated financial advice.
- Push notifications, email and SMS delivery are not included; background alerts appear in the in-app notification list.
