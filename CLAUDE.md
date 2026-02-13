# Mojo-LSP - Claude Code Instructions

## Build

Before committing anything, run all tests, fixing them if necessary. If test assertions are being removed, ask me to review them.

## Testing Patterns

 then inject mock objects.
- Use `tmp_path` fixture for filesystem tests
- Tests requiring external repos (mojo-lsp, smojol) are integration tests

## Programming Patterns

- Use proper dependency injection for interfaces to external systems like Neo4J, OS, and File I/O. Do not hardcode importing the concrete modules in these cases.
- Minimise and/or avoid mutation
- Write your code in the Functional Programming style, but balance it with readability
- Minimise magic strings and numbers by refactoring them into constants
- Don't expose raw global variables in files indiscriminately; wrap them as constants in classes, etc.
- Parameters in functions, if they must have default values, must have those values as empty structures corresponding to the non-empty types (empty dictionaries, lists, etc.). Categorically, do not use NULL.
- If a function has a non-NULL return type, never return NULL.
- If a function returns a non-NULL type in its signature, but cannot return an object of that type because of some condition, use NULL object pattern. Do not return NULL.
- Prefer small, composable functions. Do not write massive functions.

## Notes

- If Talisman detects a potential secret, stop what you are doing, prompt me for what needs to be done, and only then should you update the `.talismanrc` file.
- Potential secrets in files trigger Talisman pre-commit hook - add to `.talismanrc` if needed. Don't overwrite existing `.talismanrc` entries, add at the end
- Integration tests depend on local repo paths
