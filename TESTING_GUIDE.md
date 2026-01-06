# Testing Guide: Master Password Setup for New Users

## Overview
This guide will help you test the new functionality where users who log in without a Master Password set will be prompted to create one.

## Prerequisites
- Running dev server (`npm run dev`)
- Access to Supabase dashboard to check database state
- Test user accounts (both new and existing)

## Test Scenarios

### Scenario 1: New User - Email/Password Login
**Goal**: Verify that a new user is prompted to set up a Master Password after first login.

**Steps**:
1. Navigate to `http://localhost:3000/login`
2. Click "Sign up" to create a new account
3. Complete registration with a new email/password
4. After successful registration, log in with the new credentials
5. **Expected Result**: You should be redirected to `/master-password?setup=true`
6. **Expected UI**: 
   - Page title: "Set Master Password"
   - Description: "Create a master password to encrypt your credentials..."
   - Two password fields: "Master Password" and "Confirm Master Password"
   - Minimum 12 characters requirement shown
7. Enter a master password (min 12 characters) and confirm it
8. Click "Set Master Password"
9. **Expected Result**: Redirected to `/vault` with access to the vault

**Database Verification**:
- Check `vault_users` table in Supabase
- Should see a new row with `user_id` matching your user and `master_password_hash` populated

---

### Scenario 2: Existing User - Has Master Password
**Goal**: Verify that existing users are prompted to unlock their vault.

**Steps**:
1. Log out if currently logged in
2. Navigate to `http://localhost:3000/login`
3. Log in with an existing account that already has a master password set
4. **Expected Result**: Redirected to `/master-password` (without `?setup=true`)
5. **Expected UI**:
   - Page title: "Unlock Vault"
   - Description: "Enter your master password to unlock the vault."
   - Single password field: "Master Password"
6. Enter the correct master password
7. Click "Unlock Vault"
8. **Expected Result**: Redirected to `/vault` with access to credentials

---

### Scenario 3: New User - Google OAuth Login
**Goal**: Verify that new users logging in via Google are prompted to set up Master Password.

**Steps**:
1. Navigate to `http://localhost:3000/login`
2. Click "Sign in with Google"
3. Complete Google OAuth flow with a NEW Google account (not previously used)
4. **Expected Result**: After OAuth callback, redirected to `/master-password?setup=true`
5. Follow same steps as Scenario 1 to set up master password

---

### Scenario 4: Existing User - Google OAuth Login
**Goal**: Verify that existing Google OAuth users are prompted to unlock vault.

**Steps**:
1. Log out if currently logged in
2. Navigate to `http://localhost:3000/login`
3. Click "Sign in with Google"
4. Complete Google OAuth flow with an account that already has a master password
5. **Expected Result**: Redirected to `/master-password` (unlock mode)
6. Follow same steps as Scenario 2 to unlock vault

---

## Edge Cases to Test

### Edge Case 1: Wrong Master Password
1. Log in as existing user
2. At unlock screen, enter incorrect master password
3. **Expected Result**: Error message displayed, user remains on unlock page

### Edge Case 2: Password Too Short (Setup)
1. Log in as new user
2. At setup screen, try to enter password less than 12 characters
3. **Expected Result**: Validation error shown

### Edge Case 3: Passwords Don't Match (Setup)
1. Log in as new user
2. At setup screen, enter different passwords in the two fields
3. **Expected Result**: Error message "Passwords do not match"

### Edge Case 4: Direct URL Access
1. While logged out, try to access `http://localhost:3000/vault` directly
2. **Expected Result**: Redirected to `/login`
3. After login (as new user), should go through master password setup flow

---

## Database Queries for Verification

### Check if user has master password:
```sql
SELECT 
  u.email,
  vu.master_password_hash IS NOT NULL as has_master_password,
  vu.created_at,
  vu.master_password_verified_at
FROM auth.users u
LEFT JOIN vault_users vu ON u.id = vu.user_id
WHERE u.email = 'your-test-email@example.com';
```

### View all vault users:
```sql
SELECT 
  u.email,
  vu.created_at as master_password_created_at,
  vu.master_password_verified_at
FROM vault_users vu
JOIN auth.users u ON vu.user_id = u.id
ORDER BY vu.created_at DESC;
```

---

## Troubleshooting

### Issue: Stuck in redirect loop
**Solution**: Clear browser cookies and try again. The middleware uses cookies to track authentication state.

### Issue: "Session not established" error
**Solution**: This is a timing issue. The login API includes a 1-second delay to ensure cookies are written. If this persists, increase the delay in `app/(auth)/login/page.tsx` line 58.

### Issue: Master password setup doesn't save
**Solution**: Check Supabase logs for RLS policy errors. Ensure the authenticated user has INSERT permissions on `vault_users` table.

---

## Success Criteria
✅ New users (email/password) are prompted to set up master password  
✅ New users (Google OAuth) are prompted to set up master password  
✅ Existing users (email/password) are prompted to unlock vault  
✅ Existing users (Google OAuth) are prompted to unlock vault  
✅ Master password hash is correctly saved to database  
✅ Users can access vault after setting/entering master password  
✅ Middleware correctly enforces authentication and master password unlock  

---

## Files Modified
- `app/api/auth/login/route.ts` - Added master password check for email/password login
- `app/api/auth/callback/route.ts` - Added master password check for OAuth callback
