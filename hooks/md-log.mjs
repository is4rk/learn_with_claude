#!/usr/bin/env node
/**
 * md-log — mirror the session to a markdown file for comfortable reading.
 *
 * Meant for long teaching sessions where the terminal is hard on the eyes and
 * markdown/math/code don't render. The linked .md is viewed rendered (e.g. in
 * Obsidian), so $...$ math, code blocks and markdown render natively.
 *
 * Captures only reading-relevant content: user prompts, assistant prose, and
 * AskUserQuestion Q&A (quiz and preference questions). Other tools are omitted.
 * Question blocks are written BEFORE the user answers (PreToolUse) so the reader
 * sees them live; they never contain a correct answer or explanation — Claude
 * reveals those in its reply after grading.
 *
 * Prose Claude writes before a tool call in the same turn doesn't reliably reach
 * the transcript, so it can't be scraped from there in time (or at all). Claude
 * sends that prose explicitly with `note` before calling AskUserQuestion; the
 * transcript flush skips any text a note already logged.
 *
 * Usage:
 *   md-log.mjs link <file>   set the log file (the next hook event backfills the session)
 *   md-log.mjs unlink        stop logging
 *   md-log.mjs note          append Claude prose (markdown on stdin); no-op when unlinked
 *   md-log.mjs hook          hook entry point (event JSON on stdin)
 *
 * Append-only. State lives in <project>/.claude/.memory/md-log.json (gitignored).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// This file lives at <project>/.claude/hooks/, so `note` works from any cwd.
const projectDir = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Relative log paths resolve against the Obsidian vault when one is configured.
const vaultDir = process.env.LEARN_VAULT_DIR || projectDir;
const statePath = path.join(projectDir, ".claude", ".memory", "md-log.json");

function loadState() {
	try {
		return JSON.parse(fs.readFileSync(statePath, "utf-8"));
	} catch {
		return { file: null, backfill: false, offsets: {}, notes: [] };
	}
}

function saveState(state) {
	fs.mkdirSync(path.dirname(statePath), { recursive: true });
	fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function append(file, text) {
	try {
		const current = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
		const prefix = current.trim().length > 0 ? "\n\n" : "";
		fs.writeFileSync(file, current + prefix + text + "\n", "utf-8");
	} catch {
		// File may have been deleted externally; ignore.
	}
}

// --- Formatting ---

function callout(type, title, bodyLines) {
	const lines = [`> [!${type}] ${title}`];
	for (const line of bodyLines) lines.push(line.length === 0 ? ">" : `> ${line}`);
	return lines.join("\n");
}

const userBlock = (text) => `> [!quote] YOU\n\n${text}`;
const assistantBlock = (text) => `> [!abstract] CLAUDE\n\n${text}`;

function questionBlocks(input) {
	const questions = Array.isArray(input?.questions) ? input.questions : [];
	return questions.map((q) => {
		const body = String(q.question ?? "").split("\n");
		const options = Array.isArray(q.options) ? q.options : [];
		if (options.length) {
			body.push("");
			options.forEach((o, i) => body.push(`${i + 1}. ${o.label}`));
		}
		return callout("question", q.header ? `Question — ${q.header}` : "Question", body);
	});
}

function answerBlock(response) {
	let answers = response?.answers;
	if (typeof response === "string") {
		try {
			answers = JSON.parse(response)?.answers ?? response;
		} catch {
			answers = response;
		}
	}
	const body = [];
	if (answers && typeof answers === "object") {
		for (const [q, a] of Object.entries(answers)) body.push(Object.keys(answers).length > 1 ? `${q} → ${a}` : String(a));
	} else if (answers) {
		body.push(String(answers));
	}
	if (body.length === 0) body.push("(no answer)");
	return callout("example", "Answer", body);
}

// --- Transcript flushing ---

function textOf(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((c) => c?.type === "text")
		.map((c) => c.text)
		.join("\n");
}

function isNoise(text) {
	// Slash-command wrappers, local-command output and messages from subagents or
	// background tasks are not user prose.
	return (
		/^<(command-|local-command|system-reminder|task-notification|agent-message)/.test(text) ||
		/^Another Claude session sent a message/.test(text)
	);
}

// Notes are matched against transcript text by whitespace-insensitive content.
const normalize = (text) => text.replace(/\s+/g, " ").trim();

function alreadyNoted(state, text) {
	const t = normalize(text);
	// Containment covers a note that is one chunk of a longer text block (or vice versa);
	// short fragments only count on an exact match.
	return (state.notes ?? []).some((n) => n === t || (Math.min(n.length, t.length) >= 40 && (n.includes(t) || t.includes(n))));
}

/** Append everything new in the transcript (assistant prose; also user prompts on backfill). */
function flush(state, sessionId, transcriptPath, { includeUser }) {
	if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
	const lines = fs.readFileSync(transcriptPath, "utf-8").split("\n").filter(Boolean);
	const start = state.offsets[sessionId] ?? 0;
	let lastUser = null;
	let end = lines.length;
	for (let i = start; i < lines.length; i++) {
		let entry;
		try {
			entry = JSON.parse(lines[i]);
		} catch {
			// A half-written last line: re-read it next time instead of skipping it.
			if (i === lines.length - 1) end = i;
			continue;
		}
		if (entry.isSidechain) continue;
		if (entry.type === "assistant") {
			const text = textOf(entry.message?.content).trim();
			if (text && !alreadyNoted(state, text)) append(state.file, assistantBlock(text));
		} else if (entry.type === "user" && includeUser && !entry.isMeta && (entry.origin?.kind ?? "human") === "human") {
			const text = textOf(entry.message?.content).trim();
			if (text && !isNoise(text)) {
				append(state.file, userBlock(text));
				lastUser = text;
			}
		}
	}
	state.offsets[sessionId] = end;
	return lastUser;
}

// --- Entry points ---

const [, , cmd, arg] = process.argv;

if (cmd === "link") {
	if (!arg) {
		console.error("usage: md-log link <file>");
		process.exit(1);
	}
	const file = path.resolve(vaultDir, arg.trim());
	fs.mkdirSync(path.dirname(file), { recursive: true });
	if (!fs.existsSync(file)) fs.writeFileSync(file, "");
	const state = loadState();
	state.file = file;
	state.backfill = true;
	state.offsets = {};
	saveState(state);
	console.log(`md-log linked to ${file}. The session so far will be backfilled on the next event.`);
} else if (cmd === "unlink") {
	const state = loadState();
	state.file = null;
	saveState(state);
	console.log("md-log stopped.");
} else if (cmd === "note") {
	let raw = "";
	for await (const chunk of process.stdin) raw += chunk;
	const text = raw.trim();
	const state = loadState();
	if (state.file && text) {
		append(state.file, assistantBlock(text));
		// Keep only recent notes; the transcript copy (if any) arrives within a few turns.
		state.notes = [...(state.notes ?? []), normalize(text)].slice(-50);
		saveState(state);
	}
} else if (cmd === "hook") {
	let raw = "";
	for await (const chunk of process.stdin) raw += chunk;
	let event;
	try {
		event = JSON.parse(raw);
	} catch {
		process.exit(0);
	}
	const state = loadState();
	if (!state.file) process.exit(0);

	const sid = event.session_id ?? "default";
	const name = event.hook_event_name;
	let backfilledUser = null;

	if (state.backfill) {
		state.backfill = false;
		backfilledUser = flush(state, sid, event.transcript_path, { includeUser: true });
	} else {
		flush(state, sid, event.transcript_path, { includeUser: false });
	}

	if (name === "UserPromptSubmit") {
		const prompt = String(event.prompt ?? "").trim();
		if (prompt && prompt !== backfilledUser && !isNoise(prompt)) append(state.file, userBlock(prompt));
	} else if (name === "PreToolUse" && event.tool_name === "AskUserQuestion") {
		for (const b of questionBlocks(event.tool_input)) append(state.file, b);
	} else if (name === "PostToolUse" && event.tool_name === "AskUserQuestion") {
		append(state.file, answerBlock(event.tool_response));
	}
	// Stop: the flush above already wrote the final assistant text.

	saveState(state);
} else {
	console.error("usage: md-log.mjs link <file> | unlink | note | hook");
	process.exit(1);
}
