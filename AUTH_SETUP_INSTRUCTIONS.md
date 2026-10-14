# 🔐 OpportunityHub Authentication Setup

## ✅ Status: Credentials Received & Ready to Configure

Your credentials have been added to `.env.local`:
- ✅ Supabase Project URL
- ✅ Supabase Anon Key  
- ✅ Google OAuth Client ID
- ✅ Google OAuth Client Secret

## 📋 Two-Step Setup Required

### Step 1: Enable Google OAuth in Supabase (5 minutes)

1. Go to your Supabase Dashboard: https://app.supabase.com/project/iofmootqzpkzeuedmamr
2. Navigate to **Authentication → Providers**
3. Find **Google** in the list
4. Click to expand Google provider
5. Toggle **Enable Google** to ON
6. Paste your credentials:
   - **Client ID**: `***REMOVED-GOOGLE-CLIENT-ID***.apps.googleusercontent.com`
   - **Client Secret**: `***REMOVED-GOOGLE-CLIENT-SECRET***`
7. Click **Save**

### Step 2: Configure Redirect URLs (2 minutes)

In the same Supabase Authentication settings:

1. Go to **URL Configuration**
2. Under "Redirect URLs", add:
   - `http://localhost:3000/auth/callback`
3. Click **Save**

### Step 3: Enable Email Auth (Optional but Recommended)

For testing without Google OAuth:

1. Still in Authentication section
2. Go to **Providers → Email**
3. Toggle **Enable Email Provider** to ON
4. Toggle **Confirm email** to OFF (for local testing)
5. Click **Save**

This lets you test with email/password signup immediately.

## 🧪 Testing Auth

Once setup is complete:

1. Restart dev server: `npm run dev`
2. Visit: http://localhost:3000
3. Click "Sign up" or "Log in"
4. You should see:
   - Three account type options (Student/School/Organization)
   - Email signup form (if you enabled it)
   - Google OAuth button (if configured)

## ✅ Auth Flow

```
User visits /login or /signup
    ↓
Chooses account type (Student/School/Organization)
    ↓
Either:
  A) Signs up with email + password (Email provider)
  B) Signs up with Google OAuth
    ↓
Supabase creates auth.users record
    ↓
App creates profiles record
    ↓
User logged in, redirected to dashboard
```

## 📝 Environment Variables Added

Your `.env.local` now has:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=***REMOVED-GOOGLE-CLIENT-ID***.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=***REMOVED-GOOGLE-CLIENT-SECRET***
```

These are used by Supabase to handle OAuth redirects.

## 🔗 Redirect URI in Google Cloud

Your Google OAuth app should have this redirect URI configured:
- `https://hdmesijuuqgmrmusdtwq.supabase.co/auth/v1/callback`

(Supabase handles this automatically, but verify in Google Cloud Console if having issues)

## 🚀 Ready to Test

Once you complete Steps 1-2 above:

1. Restart dev server (if running): `npm run dev`
2. Visit: http://localhost:3000/login
3. Try signing up
4. Should work!

---

**Next**: Complete the Supabase OAuth setup, then visit http://localhost:3000 and test signup/login
