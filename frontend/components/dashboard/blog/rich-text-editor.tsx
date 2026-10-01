"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Word-like editor for blog posts. Produces HTML limited to what the backend keeps
 * (apps/blog/html.py): paragraphs, H2/H3, bold, italic, underline, strike, lists,
 * quotes, links and dividers.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  labelledBy,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  labelledBy: string;
  describedBy?: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const editor = useEditor({
    immediatelyRender: false, // rendered on the client only (avoids hydration mismatch)
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["mailto", "tel"],
          HTMLAttributes: { rel: "noopener noreferrer", target: null },
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class:
          "rich-text min-h-96 px-4 py-4 focus:outline-none sm:px-6 [&_p.is-editor-empty:first-child]:before:text-muted-foreground",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    onBlur: () => onBlur?.(),
  });

  return (
    <div
      className={cn(
        "bg-background focus-within:ring-ring/50 overflow-hidden rounded-xl border focus-within:ring-[3px]",
        invalid && "border-destructive",
      )}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          setLinkOpen(true);
        }
      }}
    >
      <Toolbar editor={editor} onLink={() => setLinkOpen(true)} />
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="min-h-96" aria-hidden />
      )}
      {editor && (
        <LinkDialog
          editor={editor}
          open={linkOpen}
          onOpenChange={setLinkOpen}
        />
      )}
    </div>
  );
}

type Editor = NonNullable<ReturnType<typeof useEditor>>;

function Toolbar({
  editor,
  onLink,
}: {
  editor: Editor | null;
  onLink: () => void;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e && {
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        quote: e.isActive("blockquote"),
        link: e.isActive("link"),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      },
  });
  const chain = () => editor!.chain().focus();

  const tools: (
    | {
        label: string;
        icon: LucideIcon;
        active?: boolean;
        disabled?: boolean;
        run: () => void;
      }
    | "|"
  )[] = [
    {
      label: "Heading",
      icon: Heading2Icon,
      active: state?.h2,
      run: () => chain().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Subheading",
      icon: Heading3Icon,
      active: state?.h3,
      run: () => chain().toggleHeading({ level: 3 }).run(),
    },
    "|",
    {
      label: "Bold (Ctrl+B)",
      icon: BoldIcon,
      active: state?.bold,
      run: () => chain().toggleBold().run(),
    },
    {
      label: "Italic (Ctrl+I)",
      icon: ItalicIcon,
      active: state?.italic,
      run: () => chain().toggleItalic().run(),
    },
    {
      label: "Underline (Ctrl+U)",
      icon: UnderlineIcon,
      active: state?.underline,
      run: () => chain().toggleUnderline().run(),
    },
    {
      label: "Strikethrough",
      icon: StrikethroughIcon,
      active: state?.strike,
      run: () => chain().toggleStrike().run(),
    },
    {
      label: "Link (Ctrl+K)",
      icon: LinkIcon,
      active: state?.link,
      run: onLink,
    },
    "|",
    {
      label: "Bulleted list",
      icon: ListIcon,
      active: state?.bullet,
      run: () => chain().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrderedIcon,
      active: state?.ordered,
      run: () => chain().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      icon: QuoteIcon,
      active: state?.quote,
      run: () => chain().toggleBlockquote().run(),
    },
    {
      label: "Divider",
      icon: MinusIcon,
      run: () => chain().setHorizontalRule().run(),
    },
    "|",
    {
      label: "Undo (Ctrl+Z)",
      icon: Undo2Icon,
      disabled: !state?.canUndo,
      run: () => chain().undo().run(),
    },
    {
      label: "Redo (Ctrl+Shift+Z)",
      icon: Redo2Icon,
      disabled: !state?.canRedo,
      run: () => chain().redo().run(),
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="bg-muted/50 sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b p-1.5"
    >
      {tools.map((tool, i) =>
        tool === "|" ? (
          <span key={i} className="bg-border mx-1 h-6 w-px" aria-hidden />
        ) : (
          <Button
            key={tool.label}
            type="button"
            variant="ghost"
            size="icon"
            title={tool.label}
            aria-label={tool.label.replace(/ \(.*\)$/, "")}
            aria-pressed={tool.active === undefined ? undefined : tool.active}
            disabled={!editor || tool.disabled}
            onMouseDown={(e) => e.preventDefault()} // keep the text selection
            onClick={tool.run}
            className="aria-pressed:bg-background aria-pressed:text-primary aria-pressed:shadow-sm"
          >
            <tool.icon aria-hidden />
          </Button>
        ),
      )}
    </div>
  );
}

function LinkDialog({
  editor,
  open,
  onOpenChange,
}: {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <LinkForm editor={editor} close={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function LinkForm({ editor, close }: { editor: Editor; close: () => void }) {
  const current =
    (editor.getAttributes("link").href as string | undefined) ?? "";
  const [href, setHref] = useState(current);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) chain.unsetLink().run();
    else {
      const full = /^(https?:|mailto:|tel:|\/)/i.test(url)
        ? url
        : `https://${url}`;
      if (editor.state.selection.empty && !current) {
        chain
          .insertContent({
            type: "text",
            text: url,
            marks: [{ type: "link", attrs: { href: full } }],
          })
          .run();
      } else chain.setLink({ href: full }).run();
    }
    close();
  }

  return (
    <form onSubmit={apply} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{current ? "Edit link" : "Add a link"}</DialogTitle>
        <DialogDescription>
          Links to other websites, an email address (mailto:) or a phone number
          (tel:).
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-href">Web address</Label>
        <Input
          id="link-href"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="https://"
          autoFocus
          className="h-11"
        />
      </div>
      <DialogFooter className="gap-2">
        {current && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              close();
            }}
          >
            Remove link
          </Button>
        )}
        <Button type="submit">{current ? "Update link" : "Add link"}</Button>
      </DialogFooter>
    </form>
  );
}
