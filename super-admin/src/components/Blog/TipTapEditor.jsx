import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { BubbleMenu as BubbleMenuExtension } from "@tiptap/extension-bubble-menu";
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { FontFamily } from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Typography } from "@tiptap/extension-typography";
import { CharacterCount } from "@tiptap/extension-character-count";
import Swal from "sweetalert2";
import {
  FiBold,
  FiItalic,
  FiEye,
  FiEyeOff,
  FiCode,
  FiLink,
  FiImage,
  FiList,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiAlignJustify,
  FiMessageSquare,
  FiUnderline,
  FiRotateCcw,
  FiRotateCw,
  FiMinus,
  FiSave,
  FiChevronDown,
  FiChevronUp,
  FiMonitor,
  FiX,
  FiMaximize2,
  FiEdit2,
  FiFileText,
  FiGrid,
  FiPlus,
  FiTrash,
  FiSlash,
  FiYoutube,
  FiCheckSquare,
  FiSquare,
  FiType,
  FiHash,
  FiMoreHorizontal,
  FiMaximize,
  FiType as FiFont,
} from "react-icons/fi";
import { 
  MdOutlineFormatStrikethrough,
  MdOutlineClearAll,
  MdOutlineTableRows,
  MdOutlineTableChart,
  MdFormatIndentIncrease,
  MdFormatIndentDecrease,
} from "react-icons/md";
import { useState, useEffect } from "react";
import "./TipTapEditor.css";


const API_BASE_URL = import.meta.env.VITE_RENDER_API_BASE_URL || "http://localhost:5000/api";

const lowlight = createLowlight(common);

// Custom Image Extension with adjustable properties
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          element.style.width || element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}` };
        },
      },
      height: {
        default: null,
        parseHTML: (element) =>
          element.style.height || element.getAttribute("height"),
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { style: `height: ${attributes.height}` };
        },
      },
      borderRadius: {
        default: null,
        parseHTML: (element) => element.style.borderRadius,
        renderHTML: (attributes) => {
          if (!attributes.borderRadius) return {};
          return { style: `border-radius: ${attributes.borderRadius}` };
        },
      },
      display: {
        default: "block",
        parseHTML: (element) => element.style.display,
        renderHTML: (attributes) => {
          return { style: `display: ${attributes.display || "block"}` };
        },
      },
      margin: {
        default: "auto",
        parseHTML: (element) => element.style.margin,
        renderHTML: (attributes) => {
          return { style: `margin: ${attributes.margin || "auto"}` };
        },
      },
    };
  },
});

// Extended TextStyle with fontSize support
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          };
        },
      },
    };
  },
});

// Custom subscript extension
const Subscript = CustomTextStyle.extend({
  name: "subscript",

  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          return {
            style: "vertical-align: sub; font-size: smaller;",
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "sub",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sub", HTMLAttributes, 0];
  },

  addCommands() {
    return {
      toggleSubscript:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
    };
  },
});

// Custom superscript extension
const Superscript = CustomTextStyle.extend({
  name: "superscript",

  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          return {
            style: "vertical-align: super; font-size: smaller;",
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "sup",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sup", HTMLAttributes, 0];
  },

  addCommands() {
    return {
      toggleSuperscript:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
    };
  },
});

// Custom Indent Extension
const Indent = TextStyle.extend({
  name: "indent",

  addOptions() {
    return {
      types: ["paragraph", "heading", "listItem"],
      minLevel: 0,
      maxLevel: 10,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) =>
              parseInt(element.style.paddingLeft, 10) / 40 || 0,
            renderHTML: (attributes) => {
              if (!attributes.indent) {
                return {};
              }
              return {
                style: `padding-left: ${attributes.indent * 40}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, {
              indent: (this.editor.getAttributes(type).indent || 0) + 1,
            })
          );
        },
      outdent:
        () =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, {
              indent: Math.max(0, (this.editor.getAttributes(type).indent || 0) - 1),
            })
          );
        },
    };
  },
});

// Custom Line Height Extension
const LineHeight = TextStyle.extend({
  name: "lineHeight",

  addOptions() {
    return {
      types: ["paragraph", "heading"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { lineHeight })
          );
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { lineHeight: null })
          );
        },
    };
  },
});

const CustomTooltip = ({ children, text }) => {
  if (!text) return children;
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className="absolute top-full mt-2 hidden group-hover:flex flex-col items-center z-[100] pointer-events-none">
        <div className="w-2 h-2 bg-slate-800 rotate-45 -mb-1"></div>
        <div className="bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded shadow-xl whitespace-nowrap">
          {text}
        </div>
      </div>
    </div>
  );
};

const MenuBar = ({
  editor,
  showSource,
  onToggleSource,
  onSave,
  onPreview,
  onAddImage,
  onSetLink,
}) => {
  const [showTextSize, setShowTextSize] = useState(false);
  const [showHeadings, setShowHeadings] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showLineHeight, setShowLineHeight] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".dropdown-container")) {
        setShowTextSize(false);
        setShowHeadings(false);
        setShowFonts(false);
        setShowTableMenu(false);
        setShowLineHeight(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const textSizes = [
    { label: "8pt", size: "8pt" },
    { label: "10pt", size: "10pt" },
    { label: "12pt", size: "12pt" },
    { label: "14pt", size: "14pt" },
    { label: "16pt", size: "16pt" },
    { label: "18pt", size: "18pt" },
    { label: "20pt", size: "20pt" },
    { label: "24pt", size: "24pt" },
    { label: "28pt", size: "28pt" },
    { label: "32pt", size: "32pt" },
    { label: "36pt", size: "36pt" },
    { label: "48pt", size: "48pt" },
  ];

  const headings = [
    { level: 1, label: "Heading 1", tag: "h1" },
    { level: 2, label: "Heading 2", tag: "h2" },
    { level: 3, label: "Heading 3", tag: "h3" },
    { level: 4, label: "Heading 4", tag: "h4" },
    { level: 5, label: "Heading 5", tag: "h5" },
    { level: 6, label: "Heading 6", tag: "h6" },
    { level: 0, label: "Paragraph", tag: "p" },
  ];
  
  const fontFamilies = [
    { label: "Default", value: "" },
    { label: "Inter", value: "Inter" },
    { label: "Roboto", value: "Roboto" },
    { label: "Arial", value: "Arial" },
    { label: "Georgia", value: "Georgia" },
    { label: "Times New Roman", value: "Times New Roman" },
    { label: "Courier New", value: "Courier New" },
    { label: "Verdana", value: "Verdana" },
    { label: "Comic Sans MS", value: "Comic Sans MS, Comic Sans" },
  ];

  const lineHeights = [
    { label: "Default", value: null },
    { label: "Single (1.0)", value: "1" },
    { label: "1.15", value: "1.15" },
    { label: "1.5", value: "1.5" },
    { label: "Double (2.0)", value: "2" },
    { label: "Triple (3.0)", value: "3" },
  ];

  const setFontSize = (size) => {
    editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
    setShowTextSize(false);
  };

  const setFontFamily = (font) => {
    if (font) {
      editor.chain().focus().setFontFamily(font).run();
    } else {
      editor.chain().focus().unsetFontFamily().run();
    }
    setShowFonts(false);
  };

  const setHeading = (level) => {
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level }).run();
    }
    setShowHeadings(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-t-xl bg-slate-50 p-3">
      {/* First Row - Basic Formatting */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2 pb-2 border-b border-slate-200">
        {/* Font Family Dropdown */}
        <CustomTooltip text="Font Family">
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFonts(!showFonts);
                setShowHeadings(false);
                setShowTextSize(false);
                setShowTableMenu(false);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-[#0A4D68] text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all min-w-[120px] justify-between shadow-sm"
            >
              <span>Font</span>
              <FiChevronDown className="w-3 h-3" />
            </button>

            {showFonts && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                {fontFamilies.map((font, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFontFamily(font.value)}
                    className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-sm border-b border-gray-100 last:border-b-0"
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CustomTooltip>

        {/* Text Size Dropdown */}
        <CustomTooltip text="Font Size">
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTextSize(!showTextSize);
                setShowHeadings(false);
                setShowFonts(false);
                setShowTableMenu(false);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-[#0A4D68] text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all min-w-[80px] justify-between shadow-sm"
            >
              <span>Size</span>
              <FiChevronDown className="w-3 h-3" />
            </button>

            {showTextSize && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                {textSizes.map((size, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFontSize(size.size)}
                    className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-sm border-b border-gray-100 last:border-b-0"
                    style={{ fontSize: size.size }}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CustomTooltip>

        {/* Headings Dropdown */}
        <CustomTooltip text="Apply Heading Style">
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowHeadings(!showHeadings);
                setShowTextSize(false);
                setShowFonts(false);
                setShowTableMenu(false);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-[#0A4D68] text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all min-w-[110px] justify-between shadow-sm"
            >
              <span>Headings</span>
              <FiChevronDown className="w-3 h-3" />
            </button>

            {showHeadings && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-20">
                {headings.map((heading, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setHeading(heading.level)}
                    className={`w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 border-b border-gray-100 last:border-b-0 ${
                      editor.isActive("heading", { level: heading.level })
                        ? "bg-[#0A4D68]/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{heading.label}</span>
                      <span className="text-[10px] text-gray-400">Ctrl+Alt+{heading.level}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Undo / Redo */}
        <CustomTooltip text="Undo (Ctrl+Z)">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded-lg border bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm disabled:opacity-30"
          >
            <FiRotateCcw size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Redo (Ctrl+Y)">
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded-lg border bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm disabled:opacity-30"
          >
            <FiRotateCw size={16} />
          </button>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Font Style Buttons */}
        <CustomTooltip text="Bold (Ctrl+B)">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("bold")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiBold size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Italic (Ctrl+I)">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("italic")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiItalic size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Underline (Ctrl+U)">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("underline")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiUnderline size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Strikethrough">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("strike")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <MdOutlineFormatStrikethrough size={16} />
          </button>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Superscript and Subscript */}
        <CustomTooltip text="Superscript">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("superscript")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiChevronUp size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Subscript">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("subscript")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiChevronDown size={16} />
          </button>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Text Color */}
        <CustomTooltip text="Text Color">
          <div className="flex items-center space-x-2 px-2 py-1 bg-white border border-slate-100 rounded-lg shadow-sm">
            <FiType size={12} className="text-slate-400" />
            <input
              type="color"
              onChange={(event) => {
                editor.chain().focus().setColor(event.target.value).run();
              }}
              value={editor.getAttributes("textStyle").color || "#000000"}
              className="w-5 h-5 p-0 rounded cursor-pointer border-none bg-transparent"
            />
          </div>
        </CustomTooltip>

        {/* Highlight Color */}
        <CustomTooltip text="Highlight Color">
          <div className="flex items-center space-x-2 px-2 py-1 bg-white border border-slate-100 rounded-lg shadow-sm">
            <FiEdit2 size={12} className="text-slate-400" />
            <input
              type="color"
              onChange={(event) => {
                editor.chain().focus().setHighlight({ color: event.target.value }).run();
              }}
              value={editor.getAttributes("highlight").color || "#ffff00"}
              className="w-5 h-5 p-0 rounded cursor-pointer border-none bg-transparent"
            />
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
              className="text-[10px] text-slate-400 hover:text-rose-500"
              title="Remove Highlight"
            >
              <FiSlash size={10} />
            </button>
          </div>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Clear Formatting */}
        <CustomTooltip text="Clear Formatting">
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetAllMarks().run();
              editor.chain().focus().clearNodes().run();
            }}
            className="p-2 rounded-lg border bg-white text-slate-500 border-slate-100 hover:border-rose-500 hover:text-rose-500 shadow-sm transition-all"
          >
            <MdOutlineClearAll size={16} />
          </button>
        </CustomTooltip>
      </div>

      {/* Second Row - Advanced Formatting */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Lists */}
        <CustomTooltip text="Bullet List">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("bulletList")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiList size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Numbered List">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded-lg border transition-all relative ${
              editor.isActive("orderedList")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiList size={16} />
            <span className={`text-[8px] absolute top-1 right-1 font-black ${editor.isActive("orderedList") ? "text-white" : "text-[#0A4D68]"}`}>
              1
            </span>
          </button>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Text Alignment */}
        <CustomTooltip text="Align Left">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive({ textAlign: "left" })
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiAlignLeft size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Align Center">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive({ textAlign: "center" })
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiAlignCenter size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Align Right">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive({ textAlign: "right" })
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiAlignRight size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Justify">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive({ textAlign: "justify" })
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiAlignJustify size={16} />
          </button>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Block Elements */}
        <CustomTooltip text="Blockquote">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("blockquote")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiMessageSquare size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Code Block">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("codeBlock")
                ? "bg-slate-800 text-white border-slate-800 shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-slate-800 hover:text-slate-800 shadow-sm"
            }`}
          >
            <FiCode size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Horizontal Rule">
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-2 rounded-lg border border-slate-100 bg-white text-slate-500 hover:border-[#0A4D68] hover:text-[#0A4D68] transition-all shadow-sm"
          >
            <FiMinus size={16} />
          </button>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Table Menu Dropdown */}
        <CustomTooltip text="Table Management">
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTableMenu(!showTableMenu);
                setShowHeadings(false);
                setShowTextSize(false);
                setShowFonts(false);
              }}
              className={`p-2 rounded-lg border transition-all ${
                editor.isActive("table")
                  ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                  : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
              }`}
            >
              <MdOutlineTableChart size={16} />
            </button>

            {showTableMenu && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-300 rounded-md shadow-lg z-20 py-1">
                {!editor.isActive("table") ? (
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                      setShowTableMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs font-bold flex items-center gap-2"
                  >
                    <FiPlus size={14} /> Insert Table (3x3)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowTableMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs"
                    >
                      Add Column Before
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs"
                    >
                      Add Column After
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs text-rose-500"
                    >
                      Delete Column
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addRowBefore().run(); setShowTableMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs"
                    >
                      Add Row Before
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs"
                    >
                      Add Row After
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs text-rose-500"
                    >
                      Delete Row
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().mergeCells().run(); setShowTableMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs"
                    >
                      Merge Cells
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().splitCell().run(); setShowTableMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs"
                    >
                      Split Cell
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-rose-50 text-xs font-bold text-rose-600 flex items-center gap-2"
                    >
                      <FiTrash size={14} /> Delete Table
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Task List */}
        <CustomTooltip text="Task List">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("taskList")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiCheckSquare size={16} />
          </button>
        </CustomTooltip>

        {/* Indent / Outdent */}
        <CustomTooltip text="Decrease Indent">
          <button
            type="button"
            onClick={() => editor.chain().focus().outdent().run()}
            className="p-2 rounded-lg border bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm transition-all"
          >
            <MdFormatIndentDecrease size={16} />
          </button>
        </CustomTooltip>
        <CustomTooltip text="Increase Indent">
          <button
            type="button"
            onClick={() => editor.chain().focus().indent().run()}
            className="p-2 rounded-lg border bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm transition-all"
          >
            <MdFormatIndentIncrease size={16} />
          </button>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Line Height Dropdown */}
        <CustomTooltip text="Line Spacing">
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLineHeight(!showLineHeight);
                setShowHeadings(false);
                setShowTextSize(false);
                setShowFonts(false);
                setShowTableMenu(false);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-[#0A4D68] text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all min-w-[100px] justify-between shadow-sm"
            >
              <span>Spacing</span>
              <FiChevronDown className="w-3 h-3" />
            </button>

            {showLineHeight && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-300 rounded-md shadow-lg z-20">
                {lineHeights.map((lh, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (lh.value) {
                        editor.chain().focus().setLineHeight(lh.value).run();
                      } else {
                        editor.chain().focus().unsetLineHeight().run();
                      }
                      setShowLineHeight(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#0A4D68]/10 text-xs border-b border-gray-100 last:border-b-0"
                  >
                    {lh.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CustomTooltip>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Media */}
        <CustomTooltip text="Insert Image">
          <button
            type="button"
            onClick={onAddImage}
            className="p-2 rounded-lg border border-slate-100 bg-white text-slate-500 hover:border-[#0A4D68] hover:text-[#0A4D68] transition-all shadow-sm"
          >
            <FiImage size={16} />
          </button>
        </CustomTooltip>

        <CustomTooltip text="Insert/Edit Link">
          <button
            type="button"
            onClick={onSetLink}
            className={`p-2 rounded-lg border transition-all ${
              editor.isActive("link")
                ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                : "bg-white text-slate-500 border-slate-100 hover:border-[#0A4D68] hover:text-[#0A4D68] shadow-sm"
            }`}
          >
            <FiLink size={16} />
          </button>
        </CustomTooltip>

        {editor.isActive("link") && (
          <CustomTooltip text="Remove Link">
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="p-2 rounded-lg border bg-white text-rose-500 border-slate-100 hover:border-rose-500 transition-all shadow-sm"
            >
              <FiSlash size={16} />
            </button>
          </CustomTooltip>
        )}

        <div className="flex-1"></div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <CustomTooltip text={showSource ? "Switch to Visual Editor" : "Switch to Source Code"}>
            <button
              type="button"
              onClick={onToggleSource}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all ${
                showSource
                  ? "bg-[#088395] text-white border-[#088395] shadow-md"
                  : "bg-white text-slate-500 border-slate-100 hover:border-[#088395] hover:text-[#088395] shadow-sm"
              }`}
            >
              {showSource ? <FiEye size={14} /> : <FiCode size={14} />}
              <span className="text-[10px] font-black uppercase tracking-widest">{showSource ? "Visual" : "Code"}</span>
            </button>
          </CustomTooltip>

          {/* Save Button */}
          {/* <CustomTooltip text="Save Document">
            <button
              type="button"
              onClick={onSave}
              className="flex items-center space-x-2 px-4 py-1.5 bg-[#0A4D68] text-white rounded-lg hover:bg-[#088395] shadow-md transition-all duration-200 text-[10px] font-black uppercase tracking-widest"
            >
              <FiSave size={14} />
              <span>Save</span>
            </button>
          </CustomTooltip> */}
        </div>
      </div>

      {/* Styles Ribbon Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-slate-200">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Styles:</span>
        <CustomTooltip text="Reset to Normal Text">
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`px-4 py-2 rounded border text-xs font-semibold transition-all ${editor.isActive('paragraph') ? 'bg-white border-[#0A4D68] text-[#0A4D68] shadow-sm' : 'bg-white text-slate-500 border-slate-100'}`}
          >
            Normal
          </button>
        </CustomTooltip>

        <CustomTooltip text="Style as Heading 1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-4 py-2 rounded border text-lg font-bold transition-all ${editor.isActive('heading', { level: 1 }) ? 'bg-white border-[#0A4D68] text-[#0A4D68] shadow-sm' : 'bg-white text-slate-500 border-slate-100'}`}
          >
            Heading 1
          </button>
        </CustomTooltip>

        <CustomTooltip text="Style as Heading 2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-4 py-2 rounded border text-md font-bold transition-all ${editor.isActive('heading', { level: 2 }) ? 'bg-white border-[#0A4D68] text-[#0A4D68] shadow-sm' : 'bg-white text-slate-500 border-slate-100'}`}
          >
            Heading 2
          </button>
        </CustomTooltip>

        <CustomTooltip text="Style as Heading 3">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-4 py-2 rounded border text-sm font-bold transition-all ${editor.isActive('heading', { level: 3 }) ? 'bg-white border-[#0A4D68] text-[#0A4D68] shadow-sm' : 'bg-white text-slate-500 border-slate-100'}`}
          >
            Heading 3
          </button>
        </CustomTooltip>

        <CustomTooltip text="Style as Main Title">
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().setParagraph().run();
              editor.chain().focus().setMark('textStyle', { fontSize: '24pt' }).run();
              editor.chain().focus().toggleBold().run();
            }}
            className="px-4 py-2 rounded border bg-white text-slate-500 border-slate-100 text-xl font-black"
          >
            Title
          </button>
        </CustomTooltip>
      </div>
    </div>
  );
};

// Image Insert Modal with Adjustment Controls
const ImageInsertModal = ({ isOpen, onClose, onInsert }) => {
  const [imageSource, setImageSource] = useState("url");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Image adjustment properties
  const [imageWidth, setImageWidth] = useState("100%");
  const [imageHeight, setImageHeight] = useState("auto");
  const [borderRadius, setBorderRadius] = useState("8px");
  const [alignment, setAlignment] = useState("center");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        Swal.fire({
          icon: "error",
          title: "Invalid File Type",
          text: "Please select an image file",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "File Too Large",
          text: "Image must be less than 5MB",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      setSelectedFile(file);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
  };

 const handleInsert = async () => {
  let url = "";

  if (imageSource === "url") {
    if (!imageUrl.trim()) {
      Swal.fire({
        icon: "warning",
        title: "URL Required",
        text: "Please enter an image URL",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }
    url = imageUrl;
  } else {
    if (!selectedFile) {
      Swal.fire({
        icon: "warning",
        title: "File Required",
        text: "Please select an image file",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    const res = await fetch(`${API_BASE_URL}/upload-editor-image`, {
  method: "POST",
  body: formData,
});


    const data = await res.json();
    url = data.url;
  }

  // Calculate margin based on alignment
  let margin = "auto";
  if (alignment === "left") margin = "0 auto 0 0";
  if (alignment === "right") margin = "0 0 0 auto";
  if (alignment === "center") margin = "auto";

  onInsert({
    src: url,
    alt: imageAlt || "Image",
    width: imageWidth,
    height: imageHeight,
    borderRadius: borderRadius,
    display: "block",
    margin: margin,
  });

  handleClose();
};


  const handleClose = () => {
    setImageSource("url");
    setImageUrl("");
    setImageAlt("");
    setSelectedFile(null);
    setPreviewUrl("");
    setImageWidth("100%");
    setImageHeight("auto");
    setBorderRadius("8px");
    setAlignment("center");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">
            Insert & Adjust Image
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Source Selection Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setImageSource("url")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                imageSource === "url"
                  ? "border-b-2 border-[#0A4D68] text-[#0A4D68]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FiLink className="w-4 h-4 inline mr-2" />
              From URL
            </button>
            <button
              type="button"
              onClick={() => setImageSource("upload")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                imageSource === "upload"
                  ? "border-b-2 border-[#0A4D68] text-[#0A4D68]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FiImage className="w-4 h-4 inline mr-2" />
              Upload File
            </button>
          </div>

          {/* URL Input */}
          {imageSource === "url" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md 
                   focus:outline-none focus:ring-2 focus:ring-[#0A4D68]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste a valid image URL (JPG, PNG, GIF, WebP)
                </p>
              </div>
            </div>
          )}

          {/* Upload Input */}
          {imageSource === "upload" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md 
                   focus:outline-none focus:ring-2 focus:ring-[#0A4D68]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPG, PNG, GIF, WebP (max 5MB)
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          {(imageUrl || previewUrl) && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
              <div className="flex justify-center">
                <img
                  src={imageSource === "url" ? imageUrl : previewUrl}
                  alt="Preview"
                  style={{
                    width: imageWidth,
                    height: imageHeight,
                    borderRadius: borderRadius,
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    e.target.src = "";
                    e.target.style.display = "none";
                  }}
                />
              </div>
            </div>
          )}

          {/* Alt Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alt Text (Recommended)
            </label>
            <input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="Describe the image"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D68]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Improves accessibility and SEO
            </p>
          </div>

          {/* Image Adjustment Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
              <FiMaximize2 className="w-4 h-4 mr-2" />
              Image Properties
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Width
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageWidth}
                    onChange={(e) => setImageWidth(e.target.value)}
                    placeholder="e.g., 100%, 500px, auto"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm"
                  />
                  <select
                    onChange={(e) => setImageWidth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm"
                  >
                    <option value="">Quick</option>
                    <option value="25%">25%</option>
                    <option value="50%">50%</option>
                    <option value="75%">75%</option>
                    <option value="100%">100%</option>
                    <option value="300px">300px</option>
                    <option value="500px">500px</option>
                    <option value="800px">800px</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageHeight}
                    onChange={(e) => setImageHeight(e.target.value)}
                    placeholder="e.g., auto, 300px, 500px"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm"
                  />
                  <select
                    onChange={(e) => setImageHeight(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm"
                  >
                    <option value="">Quick</option>
                    <option value="auto">Auto</option>
                    <option value="200px">200px</option>
                    <option value="300px">300px</option>
                    <option value="400px">400px</option>
                    <option value="500px">500px</option>
                    <option value="600px">600px</option>
                  </select>
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Border Radius
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(e.target.value)}
                    placeholder="e.g., 8px, 50%, 0px"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm"
                  />
                  <select
                    onChange={(e) => setBorderRadius(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm"
                  >
                    <option value="">Quick</option>
                    <option value="0px">None</option>
                    <option value="4px">Small</option>
                    <option value="8px">Medium</option>
                    <option value="16px">Large</option>
                    <option value="50%">Circle</option>
                  </select>
                </div>
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alignment
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAlignment("left")}
                    className={`flex-1 px-3 py-2 border rounded-md transition-colors ${
                      alignment === "left"
                        ? "bg-[#0A4D68]/20 border-[#0A4D68] text-[#088395]"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <FiAlignLeft className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlignment("center")}
                    className={`flex-1 px-3 py-2 border rounded-md transition-colors ${
                      alignment === "center"
                        ? "bg-[#0A4D68]/20 border-[#0A4D68] text-[#088395]"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <FiAlignCenter className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlignment("right")}
                    className={`flex-1 px-3 py-2 border rounded-md transition-colors ${
                      alignment === "right"
                        ? "bg-[#0A4D68]/20 border-[#0A4D68] text-[#088395]"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <FiAlignRight className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="px-4 py-2 bg-[#0A4D68] text-white rounded-md hover:bg-[#088395] transition-colors flex items-center gap-2"
          >
            <FiImage className="w-4 h-4" />
            Insert Image
          </button>
        </div>
      </div>
    </div>
  );
};

const TipTapEditor = ({
  content,
  onChange,
  placeholder = "Start writing your blog content...",
}) => {
  const [showSource, setShowSource] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: false,
      }),
      Underline,
      Subscript,
      Superscript,
      CustomImage.configure({
        HTMLAttributes: {
          class: "editor-image",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#0A4D68] underline hover:text-[#088395]",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      CustomTextStyle,
      FontFamily,
      Color,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class:
            "bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm my-4 overflow-x-auto",
        },
      }),
      Highlight.configure({ multicolor: true }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full border border-gray-300",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Typography,
      CharacterCount,
      Indent,
      LineHeight.configure({
        types: ["paragraph", "heading"],
      }),
      BubbleMenuExtension,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none focus:outline-none min-h-[500px] p-6 leading-relaxed",
        style: "font-family: system-ui, -apple-system, sans-serif;",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleSourceToggle = () => {
    setShowSource(!showSource);
  };

  const handleSourceChange = (e) => {
    const newContent = e.target.value;
    onChange(newContent);
    if (editor) {
      editor.commands.setContent(newContent);
    }
  };

 const handleSave = async () => {
  const html = editor.getHTML();

  try {
    const response = await fetch("http://localhost:5000/api/blogs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: blogTitle,
        content: html,
      }),
    });

    const data = await response.json();
    Swal.fire("Saved!", "Your post has been saved successfully!", "success");
  } catch (error) {
    Swal.fire("Error", "Failed to save post", "error");
  }
};

  const handlePreview = () => {
    const currentContent = editor?.getHTML() || content;
    setPreviewContent(currentContent);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
  };

  const setLink = async () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;

    const { value: url } = await Swal.fire({
      title: "Insert Link",
      input: "url",
      inputLabel: "Enter URL",
      inputValue: previousUrl || "",
      showCancelButton: true,
      confirmButtonText: "Insert",
      cancelButtonText: "Remove Link",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#ef4444",
      inputValidator: (value) => {
        if (value && !value.match(/^https?:\/\/.+/)) {
          return "Please enter a valid URL starting with http:// or https://";
        }
      },
    });

    if (url === undefined) {
      return;
    }

    if (url === "" || url === null) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleImageInsert = (imageProps) => {
    if (editor) {
      editor.chain().focus().setImage(imageProps).run();
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg bg-white shadow-sm">
      <MenuBar
        editor={editor}
        showSource={showSource}
        onToggleSource={handleSourceToggle}
        onSave={handleSave}
        onPreview={handlePreview}
        onAddImage={() => setShowImageModal(true)}
        onSetLink={setLink}
      />

      {showSource ? (
        <div className="relative">
          <textarea
            value={content}
            onChange={handleSourceChange}
            placeholder="Write your HTML content here..."
            className="w-full h-96 p-4 font-mono text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#0A4D68] resize-none bg-gray-50"
            style={{ minHeight: "500px" }}
          />
          <div className="absolute bottom-4 right-4 bg-gray-800 text-white px-3 py-1 rounded text-xs font-medium">
            HTML Source
          </div>
        </div>
      ) : (
        <div className="relative">
          <style>{`
            .editor-image {
              max-width: 100%;
              height: auto;
            }
            .bubble-menu {
              display: flex;
              background-color: #0d0d0d;
              padding: 0.2rem;
              border-radius: 0.5rem;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            }
            .bubble-menu button {
              border: none;
              background: none;
              color: #fff;
              font-size: 0.85rem;
              font-weight: 500;
              padding: 0.2rem 0.4rem;
              border-radius: 0.3rem;
            }
            .bubble-menu button:hover {
              background-color: #333;
            }
            .bubble-menu button.is-active {
              color: #a975ff;
            }
          `}</style>

          {editor && (
            <BubbleMenu
              className="bubble-menu"
              tippyOptions={{ duration: 100 }}
              editor={editor}
            >
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive("bold") ? "is-active" : ""}
              >
                <FiBold />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive("italic") ? "is-active" : ""}
              >
                <FiItalic />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={editor.isActive("strike") ? "is-active" : ""}
              >
                <MdOutlineFormatStrikethrough />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={editor.isActive("underline") ? "is-active" : ""}
              >
                <FiUnderline />
              </button>
              <div className="w-px h-4 bg-gray-700 mx-1 self-center"></div>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}
              >
                H1
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
              >
                H2
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={editor.isActive("blockquote") ? "is-active" : ""}
              >
                <FiMessageSquare />
              </button>
              <button
                onClick={setLink}
                className={editor.isActive("link") ? "is-active" : ""}
              >
                <FiLink />
              </button>
            </BubbleMenu>
          )}

          <EditorContent
            editor={editor}
            className="min-h-[500px] bg-white prose-editor"
          />
        </div>
      )}

      {editor && (
        <div className="flex items-center justify-between px-6 py-2 bg-slate-50 border-t border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-b-lg">
          <div className="flex gap-4">
            <span>{editor.storage.characterCount.characters()} Characters</span>
            <span>{editor.storage.characterCount.words()} Words</span>
          </div>
          <div className="flex gap-4">
            {editor.isActive('table') && (
              <span className="text-[#0A4D68]">Table Mode Active</span>
            )}
          </div>
        </div>
      )}

      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={handleImageInsert}
      />
    </div>
  );
};

export default TipTapEditor;
