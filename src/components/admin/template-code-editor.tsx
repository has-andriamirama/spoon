"use client";

import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
} from "react";
import { cn } from "@/lib/utils";

export interface TemplateCodeEditorHandle {
	insertText: (text: string) => void;
	focus: () => void;
}

interface TemplateCodeEditorProps {
	value: string;
	onChange: (value: string) => void;
	onRunShortcut?: () => void;
	className?: string;
	textareaId?: string;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function highlightHtml(raw: string): string {
	let html = escapeHtml(raw);

	html = html.replace(
		/(&lt;!--[\s\S]*?--&gt;)/g,
		'<span class="tce-comment">$1</span>'
	);
	html = html.replace(
		/(\{\{[a-zA-Z0-9_]+\}\})/g,
		'<span class="tce-var">$1</span>'
	);
	html = html.replace(
		/([a-zA-Z-]+)(=)(&quot;[^&]*&quot;)/g,
		'<span class="tce-attr">$1</span>$2<span class="tce-val">$3</span>'
	);
	html = html.replace(
		/(&lt;\/?)([a-zA-Z][a-zA-Z0-9-]*)/g,
		'$1<span class="tce-tag">$2</span>'
	);

	return html + "\n";
}

const TemplateCodeEditor = forwardRef<TemplateCodeEditorHandle, TemplateCodeEditorProps>(
	function TemplateCodeEditor(
		{ value, onChange, onRunShortcut, className, textareaId },
		ref
	) {
		const textareaRef = useRef<HTMLTextAreaElement>(null);
		const backdropRef = useRef<HTMLPreElement>(null);
		const gutterRef = useRef<HTMLDivElement>(null);

		const highlighted = useMemo(() => highlightHtml(value), [value]);
		const lineCount = useMemo(() => value.split("\n").length, [value]);

		const syncScroll = useCallback(() => {
			const ta = textareaRef.current;
			if (!ta) return;
			if (backdropRef.current) {
				backdropRef.current.scrollTop = ta.scrollTop;
				backdropRef.current.scrollLeft = ta.scrollLeft;
			}
			if (gutterRef.current) {
				gutterRef.current.scrollTop = ta.scrollTop;
			}
		}, []);

		const insertAtCursor = useCallback(
			(text: string) => {
				const ta = textareaRef.current;
				if (!ta) {
					onChange(value + text);
					return;
				}
				const start = ta.selectionStart ?? value.length;
				const end = ta.selectionEnd ?? value.length;
				const next = value.slice(0, start) + text + value.slice(end);
				onChange(next);
				requestAnimationFrame(() => {
					ta.focus();
					const pos = start + text.length;
					ta.selectionStart = ta.selectionEnd = pos;
					syncScroll();
				});
			},
			[onChange, syncScroll, value]
		);

		useImperativeHandle(
			ref,
			() => ({
				insertText: insertAtCursor,
				focus: () => textareaRef.current?.focus(),
			}),
			[insertAtCursor]
		);

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
				if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
					e.preventDefault();
					onRunShortcut?.();
					return;
				}
				if (e.key === "Tab") {
					e.preventDefault();
					insertAtCursor("  ");
				}
			},
			[insertAtCursor, onRunShortcut]
		);

		return (
			<div
				className={cn(
					"flex h-full min-h-0 rounded-lg border border-[#222] bg-[#0A0A0A] overflow-hidden",
					className
				)}
			>
				<div
					ref={gutterRef}
					aria-hidden="true"
					className="w-10 shrink-0 overflow-hidden bg-[#0A0A0A] px-1.5 py-3 text-right font-mono text-[11px] leading-5 text-[#4A453F] select-none"
				>
					{Array.from({ length: lineCount }, (_, i) => (
						<div key={i}>{i + 1}</div>
					))}
				</div>

				<div className="relative flex-1 min-w-0">
					<pre
						ref={backdropRef}
						aria-hidden="true"
						className="tce-scroll pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre-wrap break-words px-3 py-3 font-mono text-[11px] leading-5 text-[#C9C2B8]"
						dangerouslySetInnerHTML={{ __html: highlighted }}
					/>
					<textarea
						id={textareaId}
						ref={textareaRef}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						onScroll={syncScroll}
						onKeyDown={handleKeyDown}
						spellCheck={false}
						className="tce-scroll absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre-wrap break-words border-none bg-transparent px-3 py-3 font-mono text-[11px] leading-5 text-transparent caret-[#C8973A] outline-none"
					/>
				</div>

				<style jsx global>{`
					.tce-scroll::-webkit-scrollbar {
						width: 8px;
						height: 8px;
					}
					.tce-scroll::-webkit-scrollbar-thumb {
						background: #2a2a2a;
						border-radius: 4px;
					}
					.tce-tag {
						color: #7fb0e8;
					}
					.tce-attr {
						color: #c99be0;
					}
					.tce-val {
						color: #e8b04a;
					}
					.tce-var {
						color: #f0c060;
						background: rgba(200, 151, 58, 0.14);
						border-radius: 3px;
					}
					.tce-comment {
						color: #5a5249;
						font-style: italic;
					}
				`}</style>
			</div>
		);
	}
);

export default TemplateCodeEditor;
