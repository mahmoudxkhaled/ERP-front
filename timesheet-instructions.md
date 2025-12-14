# Timesheet Generation Instructions

## How to Use This File
Share this file with the AI assistant in any chat to automatically generate your monthly timesheet from Git commits.

---

## Step 1: Provide the Git Log with Dates

Run this command in your project folder and paste the output:

```bash
git log --since="YYYY-MM-01" --until="YYYY-MM-31" --pretty=format:"%ad | %h | %s" --date=short
```

**Replace:**
- `YYYY-MM-01` with the first day of the month (e.g., `2025-12-01`)
- `YYYY-MM-31` with the last day of the month (e.g., `2025-12-31`)

---

## Step 2: Working Hours Schedule

| Day | Hours |
|-----|-------|
| Sunday | 5 |
| Monday | 2 |
| Tuesday | 2 |
| Wednesday | 2 |
| Thursday | 5 |
| Friday | 7 |
| Saturday | 7 |

---

## Step 3: Timesheet Format Required

| Date | Category Code | Project | Task | Sub-Task | Hours |
|------|---------------|---------|------|----------|-------|
| X-Mon | Angular | ERP | [Task Name] | [Detailed technical sub-task description] | X |

---

## Step 4: Requirements

1. **Category Code:** Angular
2. **Project:** ERP
3. **Sub-Task Style:** Make sub-tasks very detailed and technical to reflect the effort and complexity of work done
4. **Group commits** by date and create meaningful task descriptions
5. **Calculate hours** based on the day of week from the schedule above
6. **Skip days** with no commits

---

## Step 5: Task Categories (Use These as Task Names)

- **Authentication Module** - Login, 2FA, logout, session management, password reset
- **Profile Module** - User profile, avatar, preferences, top bar integration
- **Entity Module** - Entity CRUD, admin management, pagination, contact management
- **Account Management** - Account dialogs, validation, state handling
- **UI/Layout** - Theme configuration, colors, styling, responsive design
- **Project Setup & Configuration** - Environment setup, routing, deployment config
- **Session Management** - Session handling, token management, auto-logout
- **Security Features** - 2FA, password policies, role-based access
- **Form Validation & UX** - Input validation, error messages, user feedback
- **Data Management** - Local storage, state persistence, caching
- **API Integration** - Service layer, HTTP calls, interceptors

---

## Example Request Message

```
Hi, I need to generate my monthly timesheet.

Here's my git log:
[PASTE GIT LOG OUTPUT HERE]

Please follow the instructions in the attached timesheet-instructions.md file.
```

---

## Example Output

| Date | Category Code | Project | Task | Sub-Task | Hours |
|------|---------------|---------|------|----------|-------|
| 1-Dec | Angular | ERP | Authentication Module | Implement complete login flow with reactive form validation, JWT token handling, API integration with error states, and automatic redirect to dashboard on success | 7 |
| 2-Dec | Angular | ERP | Entity Module | Develop entity service layer with full CRUD operations, implement HTTP interceptors for request/response transformation, create data models with TypeScript interfaces | 5 |

---

## Summary Section (Include at End)

After the timesheet, include:

| Metric | Value |
|--------|-------|
| **Total Working Days** | X |
| **Total Hours** | X hours |
| **Total Commits** | X |

