"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TiptapToolbar } from "../tiptap-toolbar";

interface TiptapEditorProps {
  value?: string;
  onBlur?: () => void;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function TextEditor({
  value = "",
  placeholder,
  onChange,
  onBlur,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit.configure({})],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
    onBlur() {
      onBlur?.();
    },
    immediatelyRender: false,
  });

  return (
    <div className="flex flex-col justify-stretch gap-2">
      <TiptapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
