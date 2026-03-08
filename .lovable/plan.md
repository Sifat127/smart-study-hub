

## Replace Logo and Rename "DIU Slider" → "DIU StudyBank"

### 1. Copy logo to project
- Copy `user-uploads://ChatGPT_Image_Mar_9_2026_04_23_27_AM.PNG` to `src/assets/logo.png`

### 2. Replace all BookOpen icon logos with the uploaded image

Every file that uses the `BookOpen` icon as a brand logo (inside a gradient square container) will be updated to use `<img src={logo} ... />` instead. Files affected:

- **`src/components/Navbar.tsx`** — navbar brand logo
- **`src/components/Footer.tsx`** — footer brand logo
- **`src/pages/Login.tsx`** — left panel + mobile logo (2 instances)
- **`src/pages/Signup.tsx`** — left panel + mobile logo (2 instances)
- **`src/pages/ForgotPassword.tsx`** — logo
- **`src/pages/ResetPassword.tsx`** — logo
- **`src/pages/AdminDashboard.tsx`** — admin header logo
- **`src/pages/AdminSettings.tsx`** — settings header logo
- **`src/pages/AdminUploadPdf.tsx`** — upload header logo

Each replaces the pattern:
```tsx
<div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
  <BookOpen className="h-5 w-5 text-primary-foreground" />
</div>
```
With:
```tsx
<img src={logo} alt="DIU StudyBank" className="h-9 w-9 rounded-lg object-contain" />
```

Note: `BookOpen` used as a content icon (e.g. in About stats, course cards) will NOT be replaced — only brand logo instances.

### 3. Rename "DIU Slider" → "DIU StudyBank" everywhere

- **`src/components/Navbar.tsx`** — `DIU <span>Slider</span>` → `DIU <span>StudyBank</span>`
- **`src/components/Footer.tsx`** — brand text + copyright line
- **`src/pages/Index.tsx`** — hero description, features heading, CTA section
- **`src/pages/Login.tsx`** — brand text (2) + description text
- **`src/pages/Signup.tsx`** — brand text (2) + "Join DIU Slider" heading
- **`src/pages/ForgotPassword.tsx`** — brand text
- **`src/pages/ResetPassword.tsx`** — brand text
- **`src/pages/About.tsx`** — page title
- **`index.html`** — document title + OG meta tags → "DIU StudyBank"

