

## Plan: Make shefatahmed0181@gmail.com an Admin

**User found:** Jahin Ahmed (user_id: `3902cda0-86fd-4e61-abde-c1708fc6fe36`), currently has role `user`.

**Action:** Update the `user_roles` table to change this user's role from `user` to `admin`.

This is a single data update operation using the insert tool:
```sql
UPDATE public.user_roles SET role = 'admin' WHERE user_id = '3902cda0-86fd-4e61-abde-c1708fc6fe36';
```

After this, Jahin Ahmed will be redirected to the Admin Dashboard upon login.

