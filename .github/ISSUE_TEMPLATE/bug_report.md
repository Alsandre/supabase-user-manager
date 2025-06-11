---
name: Bug report
about: Create a report to help us improve
title: "[BUG] "
labels: "bug"
assignees: ""
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Initialize UserManager with config '...'
2. Call method '....'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Code Example**

```typescript
// Minimal code example that reproduces the issue
const userManager = UserManager.getInstance({
  supabase: {
    url: "your-url",
    anonKey: "your-key",
  },
});

// Your code here...
```

**Error Messages**
If applicable, add error messages or console output.

**Environment (please complete the following information):**

- OS: [e.g. macOS, Windows, Linux]
- Node.js version: [e.g. 18.17.0]
- Package version: [e.g. 1.0.0]
- Browser (if applicable): [e.g. Chrome 119]
- Supabase version: [e.g. 2.38.0]

**Additional context**
Add any other context about the problem here.
