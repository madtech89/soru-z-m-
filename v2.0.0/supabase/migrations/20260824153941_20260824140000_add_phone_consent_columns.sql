/*
# Add phone column to profiles table

## What this does
1. Adds a `phone` column to the `profiles` table to store the user's phone number
   collected during registration.
2. Adds a `kvkk_consent` boolean column to track KVKK (Kişisel Verilerin Korunması) acceptance.
3. Adds a `marketing_consent` boolean column to track marketing email/SMS consent.
4. Adds a `consent_date` timestamptz column to record when the user accepted the legal terms.

## Tables affected
- profiles: 4 new columns added (phone, kvkk_consent, marketing_consent, consent_date)

## Security
- No RLS changes — profiles table already has ownership-based policies
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kvkk_consent boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consent_date timestamptz;