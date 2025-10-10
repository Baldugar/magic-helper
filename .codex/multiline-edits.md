# Multiline Editing Notes

- Run `python -c "from pathlib import Path; ..."` and include explicit `\n` characters in the string whenever you need multi-line edits.
- Example: `python -c "from pathlib import Path; path = Path('file.ts'); text = path.read_text(); path.write_text(text.replace('old', 'new', 1))"`.
- Prefer `Path.read_text()` / `Path.write_text()` helpers with `str.replace` or small scripts; this sidesteps Windows PowerShell quoting problems.
- Skip POSIX heredocs such as `cat <<'EOF'`; they fail in this environment, so lean on Python instead.
- After each modification, read the file back or print the relevant slice to confirm the change.
- Break complex updates into several focused Python calls to keep diffs understandable and reversible.
