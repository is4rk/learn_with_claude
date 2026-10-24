---
name: quiz
description: Ask the learner ONE graded multiple-choice question with a known correct answer, then grade it and explain. Use to map what the learner already knows before teaching, to check a node landed, and for retrieval practice. For preferences or decisions with no right answer, use AskUserQuestion directly instead.
---

# Quiz

A graded question: you know the right answer, the learner picks, you grade. Claude Code has no graded-question tool, so this skill builds one from `AskUserQuestion`. Ask **exactly one question per call** and adapt the next one to the last answer.

## Procedure

1. **Decide privately** the correct option(s) and the explanation. Never write them anywhere the learner can see before they answer — not in the question, option text, descriptions, or any prose you emit before the tool call.
2. **Build the options** following the construction procedure in the `teach` skill ("Writing quiz options"): bare claims, correct one written first and mutated into each distractor, no asymmetric bolding, every distractor a believable specific misconception.
3. **Shuffle.** Place the correct option at a random position — don't default to first or last. (Keep order only when it is meaningful, e.g. ordered values or "All of the above".)
4. **Always include an "I don't know" option** as the last option. Never offer your own "not sure" variants beyond that one. Pick it over guessing is the point: it marks a genuine gap, not a wrong answer.
5. **Call `AskUserQuestion`** with one question, `multiSelect: true` only when more than one option is correct (graded as an exact-set match). `AskUserQuestion` allows at most 4 options plus an automatic "Other": use up to 3 real options + "I don't know", or 4 real options and treat "Other" typed text as the escape hatch / note.
   - Put any extra context in the question text, not in option descriptions (descriptions tend to leak the answer).
   - Do **not** mark any option "(Recommended)" — that would flag the answer.
6. **Grade** from the returned answer:
   - Picked the correct option(s) → ✓.
   - Picked a distractor → ✗. Name which misconception that distractor represents; that is the diagnostic payload.
   - "I don't know" → not wrong. Treat it as a genuine gap to teach into.
   - "Other" free text → read it as a note on their thinking and let it steer your follow-up (it may also be an answer — grade it if so).
7. **Reveal** in your reply: ✓/✗/gap, the correct answer, and the explanation (why it's right, and what the chosen distractor gets wrong). Use LaTeX for any math.

## Logging prose before a question (md-log)

Prose written earlier in the same turn as an `AskUserQuestion` call (a grade and explanation, a lesson chunk) does not reliably reach the md-log file on its own. So whenever a reply has prose *and then* a question, first send that exact prose to the log, then call `AskUserQuestion`:

```bash
node .claude/hooks/md-log.mjs note <<'MDLOG'
<the same prose you are showing in chat>
MDLOG
```

It is a no-op when no log is linked, so always do it. Prose that ends a turn (no question after it) is logged automatically — don't note it.

## Reply format

```
**✓ Correct** (or **✗ Incorrect** / **Gap — "I don't know"**)
Correct answer: <the option text>

<explanation, 1–4 sentences>
```

## Reminders

- A run of correct answers means the questions are too easy — escalate (see Phase 1a in `teach`).
- A single wrong answer isn't the verdict; probe around it before concluding what kind of gap it is.
- Don't leak the answer through form: keep options even in length, specificity and phrasing.
