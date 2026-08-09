"use client";

import { Code2, FileText } from "lucide-react";

import { useDisguise } from "@/components/disguise/DisguiseProvider";

export function DisguiseOverlay() {
  const { isDisguised, mode, setMode, unmask } = useDisguise();

  if (!isDisguised) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 opacity-25 transition hover:opacity-100">
        <button
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          onClick={() => setMode(mode === "docs" ? "code" : "docs")}
          type="button"
        >
          Switch
        </button>
        <button
          aria-label="Return to Noted"
          className="h-4 w-4 rounded-full bg-slate-300"
          onClick={unmask}
          type="button"
        />
      </div>

      {mode === "docs" ? <GoogleDocsSkin /> : <CodeNotesSkin />}
    </div>
  );
}

function GoogleDocsSkin() {
  return (
    <div className="flex h-full flex-col bg-[#f8fafd]">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4 px-5 py-3">
          <FileText aria-hidden className="h-8 w-8 text-blue-600" />
          <div>
            <div className="text-sm text-slate-600">History Notes - Chapter 12</div>
            <div className="mt-2 flex gap-5 text-xs text-slate-600">
              <span>File</span>
              <span>Edit</span>
              <span>View</span>
              <span>Insert</span>
              <span>Format</span>
              <span>Tools</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-8 py-2 text-xs text-slate-600">
          <span className="rounded border px-2 py-1">100%</span>
          <span className="rounded border px-2 py-1">Normal text</span>
          <span className="rounded border px-2 py-1">Arial</span>
          <span className="rounded border px-2 py-1">11</span>
          <span className="ml-auto rounded-full bg-blue-600 px-4 py-2 font-semibold text-white">
            Share
          </span>
        </div>
      </header>
      <main className="flex flex-1 justify-center overflow-hidden bg-slate-100 py-8">
        <article className="h-[920px] w-[720px] bg-white px-20 py-16 shadow-xl">
          <h1 className="text-center text-xl font-semibold">Chapter 12 Notes</h1>
          <p className="mt-8 leading-8">
            The Progressive Era introduced reforms across education, public
            health, and local government. Key vocabulary includes muckrakers,
            suffrage, initiative, referendum, and conservation.
          </p>
          <p className="mt-6 leading-8">
            Homework reminder: complete the document outline and prepare three
            discussion questions for class.
          </p>
          <div className="mt-10 h-5 w-64 animate-pulse rounded bg-blue-100" />
        </article>
      </main>
    </div>
  );
}

function CodeNotesSkin() {
  return (
    <div className="flex h-full bg-[#1e1e1e] text-slate-200">
      <aside className="w-14 bg-[#181818] py-4 text-center text-slate-500">
        <Code2 aria-hidden className="mx-auto h-6 w-6" />
      </aside>
      <aside className="w-64 border-r border-[#2c2c2c] bg-[#252526] p-4 text-sm">
        <p className="text-xs uppercase tracking-wider text-slate-400">Explorer</p>
        <div className="mt-4 space-y-2">
          <div className="text-slate-300">school-notes</div>
          <div className="pl-4 text-blue-300">biology.md</div>
          <div className="pl-4 text-slate-400">english.md</div>
          <div className="pl-4 text-slate-400">todo.txt</div>
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
        <div className="border-b border-[#2c2c2c] bg-[#2d2d2d] px-4 py-2 text-sm">
          biology.md
        </div>
        <pre className="flex-1 p-8 font-mono text-sm leading-7 text-slate-300">
{`# Biology Review

- Mitosis has four main phases.
- Photosynthesis converts light energy into chemical energy.
- Remember to review lab safety notes before Friday.

## Todo

[ ] Finish study guide
[ ] Bring notebook to class`}
        </pre>
      </main>
    </div>
  );
}
