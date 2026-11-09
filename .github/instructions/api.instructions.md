---
applyTo: "apps/api/**/*.py"
---
- Every endpoint gets a ninja Schema for input and output.
- Read configuration from `os.environ`; no secrets in code.
- Use `gettext_lazy` for any user-facing message.