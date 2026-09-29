# Smart Study Hub

Project Title: DIU Slider

Create a modern, attractive, responsive university PDF storage website named DIU Slider.
This website will be used for storing and accessing class PDF materials in an organized and user-friendly way.

The website should have a clean, modern, premium UI design with professional academic styling.
The design must feel polished, smart, and visually appealing for university students.
Use a modern dashboard-style interface, smooth card layouts, clean typography, visible buttons, proper spacing, soft shadows, rounded corners, and a pleasant academic color palette.

Main Purpose

This website is for storing and managing class PDF materials by:

Department

Semester

Course

Chapter

There will be two main user roles:

Admin User

Normal User

User Roles and Permissions

1. Admin User

Admin will have full control over the platform.

Admin can:

Create account and log in

Upload PDF files

Add course details

Edit course details

Delete course details

Add chapter descriptions

Manage departments

Manage semesters

Manage courses

Manage chapter-wise PDF content

Control all academic material structure

Only the admin can change:

Department course structure

Semester course lists

Chapter details

PDF descriptions

Course metadata

2. Normal User

Normal users can:

Create account

Log in

Browse departments

Browse semesters

Browse courses

Open chapter pages

View PDF descriptions

Download PDFs directly

Normal users cannot:

Edit course details

Upload PDFs

Change chapters

Modify descriptions

Edit academic structure

Website Structure

The website will contain 3 departments for now:

CSE

EEE

BBA

Each department will have:

12 semesters

Each semester will contain 4 to 5 courses

Each course will contain multiple chapters

Each chapter will show:

Chapter title

Short description

PDF preview or file info

Download button

Required Features

Authentication System

Sign Up page

Login page

Role-based access (Admin / User)

Secure authentication

Remember user session

সুন্দর, clean login and registration UI

Home Page

The homepage should look premium and modern.

Include:

Website logo: DIU Slider

Attractive hero section

Short tagline like:
“Organized Academic PDF Library for Smart Learning”

Search bar for quickly finding materials

Quick access cards for departments

Featured courses or recently uploaded PDFs

Smooth navigation menu

Responsive design for desktop, tablet, and mobile

Department Section

Show 3 department cards:

CSE

EEE

BBA

Each department card should have:

Relevant icon or illustration

Short description

“Explore” button

When clicking a department, user goes to that department page.

Semester Section

Inside each department page:

Show all 12 semesters as beautiful cards or grid layout

Each semester card must be clear and clickable

Example:

Semester 1

Semester 2

Semester 3

...

Semester 12

Course Section

Inside each semester:

Show 4 to 5 course cards

Each course card should include:

Course name

Course code

Short description

Button: “View Chapters”

Only admin can add/edit/delete these courses.

Chapter Section

Inside each course page:

Show chapter list

Each chapter card should include:

Chapter title

Chapter description

PDF file name or preview info

Download button

View PDF button (optional)

When clicking on a chapter:

Show details page with chapter description and PDF access options

PDF Access

Users should be able to:

View PDF details

See description

Download PDF directly

Admin should be able to:

Upload PDF file

Update PDF

Remove PDF

Add related notes or descriptions

Admin Dashboard

Create a dedicated Admin Dashboard with a modern sidebar layout.

Admin dashboard features:

Overview statistics

Total departments

Total semesters

Total courses

Total uploaded PDFs

Manage users

Manage departments

Manage semesters

Manage courses

Manage chapters

Upload PDFs

Edit descriptions

Delete PDFs

Dashboard design should be:

Clean

Professional

Easy to navigate

Modern academic admin panel style

Frontend Design Requirements

The frontend must be very attractive and modern.

Design Style

Use:

Modern UI design

Clean academic dashboard style

Soft gradients or subtle color highlights

Professional typography

Proper spacing and alignment

Highly visible buttons

Card-based layout

Smooth hover effects

Rounded corners

Subtle shadows

Elegant icons

Color Palette Suggestion

Use a clean university-style palette such as:

Deep blue

White

Soft gray

Accent cyan or purple

Minimal gradient highlights

The UI should feel:

Trustworthy

Educational

Elegant

Tech-inspired

Student-friendly

Typography

Use modern readable fonts.
Text should be:

Perfectly aligned

Easy to read

Not overcrowded

Well matched with button labels and headings

Buttons

All buttons should be:

Clearly visible

Attractive

Easy to click

Consistent in shape and style

Button examples:

Login

Sign Up

Explore Department

View Semester

View Chapters

Download PDF

Upload PDF

Save Changes

Delete

Navigation Bar

Navbar should include:

Logo: DIU Slider

Home

Departments

About

Login

Sign Up

Dashboard (after login)

Sticky navbar preferred.

Footer

Footer should include:

DIU Slider logo/name

Quick links

Contact section

Copyright

Academic platform note

Pages Required

Create the following pages:

Home Page

Login Page

Sign Up Page

Departments Page

Single Department Page

Semester Page

Course Page

Chapter Details Page

User Dashboard

Admin Dashboard

About Page

Contact Page

Suggested Homepage Sections

Hero Section

Big heading

Short description

CTA buttons

Academic/technology illustration

Example heading:
“Access Your Department PDF Materials in One Smart Platform”

Example subheading:
“DIU Slider helps students easily explore, view, and download course materials by department, semester, course, and chapter.”

Department Highlights

CSE

EEE

BBA

Features Section

Show cards for:

Organized by Department

Semester-wise Navigation

Chapter-wise PDFs

Secure Login

Admin Management

Direct Download Access

Recent Materials Section

Show recently uploaded PDFs in cards.

Why Choose DIU Slider

Short academic benefits section.

Suggested User Experience

The user journey should be simple:

User visits homepage

Chooses department

Selects semester

Selects course

Opens chapter

Reads description

Downloads PDF

This flow must be clean and intuitive.

Data Structure Idea

Organize content like this:

Department

Semester

Course

Chapter

Title

Description

PDF File

Download Button

Important Functional Rules

Only admin can modify academic content

Normal users can only browse and download

Authentication must control access properly

PDF structure must remain organized

Search functionality should help find course/chapter/PDF easily

Website should be fully responsive

Use elegant empty states if no PDF is uploaded yet

Add success/error messages for login, upload, and actions

Branding

Website Name / Logo: DIU Slider

Logo style idea:

Minimal academic-tech logo

বই / document / folder / graduation cap inspired icon

Clean and premium look

Suitable for navbar and dashboard

Extra UI Suggestions

Add these for better frontend quality:

Search bar with filter

Department icons

Semester badges

Course cards with hover animation

Chapter accordion or clean card layout

Download icons

Smooth transitions

Mobile-friendly menu

Loading skeletons

Nice empty-state illustrations

Final Design Goal

The final website should look like a modern academic resource platform that is:

Attractive

Well organized

Easy to use

Premium looking

Responsive

Professional

Student-friendly

It should not feel plain or outdated.
It must use a modern UI/UX approach with clearly visible buttons, perfectly matched texts, smart spacing, and a polished interface

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://diu-study-bank.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c0a86538-29ac-4e9a-93cb-f0f8febaa6a5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
