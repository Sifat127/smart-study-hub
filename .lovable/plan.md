

## Verification Result + Logo Size Increase

### Verification
All 9 files correctly use the new logo (`src/assets/logo.png`) and display "DIU StudyBank" — no leftover "DIU Slider" instances found. Everything is consistent.

### Plan: Make Logo Bigger

Increase the logo icon size across all instances for better visibility:

| Location | Current Size | New Size |
|----------|-------------|----------|
| Navbar | `h-9 w-9` | `h-11 w-11` |
| Footer | `h-9 w-9` | `h-11 w-11` |
| Login (desktop panel) | `h-10 w-10` | `h-12 w-12` |
| Login (mobile) | `h-9 w-9` | `h-11 w-11` |
| Signup (desktop panel) | `h-10 w-10` | `h-12 w-12` |
| Signup (mobile) | `h-9 w-9` | `h-11 w-11` |
| ForgotPassword | `h-9 w-9` | `h-11 w-11` |
| ResetPassword | `h-9 w-9` | `h-11 w-11` |
| AdminDashboard | `h-9 w-9` | `h-11 w-11` |
| AdminSettings | `h-9 w-9` | `h-11 w-11` |
| AdminUploadPdf | `h-9 w-9` | `h-11 w-11` |

**Files to edit:** `Navbar.tsx`, `Footer.tsx`, `Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `AdminDashboard.tsx`, `AdminSettings.tsx`, `AdminUploadPdf.tsx`

