---
name: to-questionnaire
description: Turn a decision you cannot fully answer into a questionnaire for someone else to complete.
disable-model-invocation: true
---

Turn a knowledge gap into a **questionnaire**: a Markdown document that the user can send to one person to complete asynchronously, or use in a meeting. The recipient has knowledge that the user lacks. The questionnaire must collect that knowledge.

**Grill the send, not the subject.** Interview the user only about the send: who will receive it and what the user needs back. The questions in the document target the gap between what the recipient knows and what the user needs.

1. **Who will receive it?** Ask for the recipient's role, expertise, and relationship to the user. This sets the tone and amount of context. Complete when you know who the recipient is and what they know that the user does not.
2. **What must the user learn?** Ask for the specific decisions or facts the user needs from this person. Complete when you have a concrete list of what the user must be able to decide or do.
3. **Write the questionnaire.** Draft it using the structure below. Write it to `to-questionnaire-<slug>.md` in the current directory and report the path. Complete when the file exists and every need from step 2 has a question.

Use `ask_user` for each interview round.

## Document structure

Frame the document as a **discovery questionnaire**: the user lacks context, and the recipient has it. Order questions by importance because an asynchronous exchange may have only one pass. When there are more than a few questions, group them under `##` headings by theme.

# <Questionnaire title>

**Purpose:** Why this questionnaire exists and what decision depends on it.

**From:** <the user>, **To:** <the recipient>, **How your answers will be used:** <where the answers go>

## Context

One paragraph that orients a recipient who does not know the user's context. Include enough information to answer well.

## How to answer

Give the deadline and expected effort. Partial answers and “I don't know” are useful. Ask the recipient to flag uncertainty.

## <Theme heading>

Write one idea per question. Put an answer stub directly below each question. Add a one-line reason only if the question could be misunderstood or invite a low-value answer.

### <Question>

_Why this matters: <only when needed>_

>

## Anything else?

Ask for any important information that the questionnaire did not cover.
