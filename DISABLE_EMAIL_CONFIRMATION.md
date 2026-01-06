# How to Disable Email Confirmation in Supabase

## Step-by-Step Guide

### 1. **Log in to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/sign-in
   - Sign in with your preferred method (GitHub, SSO, or Email)

### 2. **Select Your Project**
   - After logging in, you'll see your project list
   - Click on your **PasswordManager** project (or whatever you named it)

### 3. **Navigate to Authentication Settings**
   - In the left sidebar, click on **Authentication** (🔐 icon)
   - Then click on **Providers** in the sub-menu

### 4. **Configure Email Provider**
   - Find the **Email** provider in the list
   - Click on it to expand the settings

### 5. **Disable Email Confirmation**
   - Look for the setting: **"Confirm email"** or **"Enable email confirmations"**
   - **Toggle it OFF** (disable it)
   - This will allow users to sign in immediately without confirming their email

### 6. **Save Changes**
   - Click **Save** button at the bottom of the form
   - Wait for the confirmation message

### 7. **Alternative: Use Email Confirmation URL (Optional)**
   If you prefer to keep email confirmation enabled but want to test quickly:
   - Go to **Authentication** → **Users** in the sidebar
   - Find your test user (`testuser1@gmail.com`)
   - Click the three dots menu (⋮) next to the user
   - Click **"Confirm email"** to manually confirm the user

## Visual Guide

```
Supabase Dashboard
└── [Your Project Name]
    └── Authentication (left sidebar)
        └── Providers
            └── Email
                └── ⚙️ Settings
                    └── ☐ Confirm email [TOGGLE THIS OFF]
                    └── [Save] button
```

## After Disabling Email Confirmation

Once you've disabled email confirmation:

1. **Go back to your app**: http://localhost:3000/register
2. **Register a new user** (or use the existing one if you manually confirmed it)
3. **Log in** with the credentials
4. **You should be redirected to**: `/master-password?setup=true`
5. **Test the master password setup** with the new password visibility toggles!

## Expected Flow After Changes

```
Register → Login → Master Password Setup → Vault
   ✓         ✓              ✓                ✓
```

## Troubleshooting

### If you still see "Please confirm your email":
- Clear your browser cookies for localhost:3000
- Try registering with a completely new email address
- Verify the setting was saved in Supabase (refresh the page and check)

### If you can't find the setting:
- Make sure you're in the correct project
- Check that you have admin/owner permissions
- Try the alternative method: manually confirm the user from the Users tab

## Security Note

⚠️ **Important**: Disabling email confirmation is fine for development/testing, but you should **re-enable it for production** to prevent spam accounts and ensure users have valid email addresses.

## Next Steps

After successfully disabling email confirmation and testing:
1. ✅ Test the new user registration flow
2. ✅ Test the master password setup page
3. ✅ Test the password visibility toggles (eye icons)
4. ✅ Test the returning user unlock flow
5. ✅ Verify the vault access works correctly

---

**Need Help?** If you encounter any issues, let me know and I can provide more specific guidance!
