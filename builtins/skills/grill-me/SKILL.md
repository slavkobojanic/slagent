---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

Interview the user until you reach a shared understanding. Map the topic as a **design tree**: each decision branches into the decisions that depend on it.

Work in **rounds**. The **frontier** is every decision whose prerequisites are settled. Ask the whole frontier in one round. Use the `ask_user` tool for the questions. Give each question a clear title, useful choices, and your recommended answer. Word each question so “yes” accepts your recommendation. Ask only decisions the user must make; inspect the environment for facts.

After each answer, update the design tree. Settled decisions can unblock later questions. Ask dependent questions in a later round, not in the current round. Repeat until every branch is settled and no decision remains assumed.

Do not plan or implement the topic until the user confirms that you reached a shared understanding. Keep each round focused and include only questions that change the design or next action.
