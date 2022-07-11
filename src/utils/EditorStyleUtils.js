import { Editor, Element, Range, Transforms } from "slate";

// Leaf styles
export const getActiveStyles = (editor) => {
  return new Set(Object.keys(Editor.marks(editor) || {}));
};

export const isStyleActive = (editor, style) =>
  getActiveStyles(editor).has(style);

export const toggleStyle = (editor, style) => {
  const currentStyles = getActiveStyles(editor);
  if (currentStyles.has(style)) {
    Editor.removeMark(editor, style);
  } else {
    // console.log("adding " + style)
    if (style === "superscript") Editor.removeMark(editor, "subscript")
    if (style === "subscript") Editor.removeMark(editor, "superscript")
    Editor.addMark(editor, style, true);
    // console.log({ marks: Editor.marks(editor) });
  }
};

// Top level block element styles
export const getTopLevelBlockStyles = (editor) => {
  const selection = editor.selection;
  if (selection == null) {
    return null;
  }

  // const topLevelBlockSelected = Editor.nodes(editor, {
  //   at: editor.selection,
  //   mode: "highest",
  //   match: (n) =>  {console.log({el:n}); return Editor.isBlock(editor, n)},
  // });

  // An optimised way
  const [start, end] = Range.edges(selection);
  let startTopNodeIndex = start.path[0]; // We pick the index of the top level ndoe
  const endTopNodeIndex = end.path[0];
  let blockType = null;
  while (startTopNodeIndex <= endTopNodeIndex) {
    // A Location like Path always starts with []
    const [node] = Editor.node(editor, [startTopNodeIndex]);
    if (blockType === null) blockType = node.type;
    else if (blockType !== node.type) return "multiple";
    startTopNodeIndex++;
  }

  return blockType;
};

export const setTopLevelBlockStyles = (editor, type) => {
  const selectedTopBlockStyles = getTopLevelBlockStyles(editor);
  if (type === selectedTopBlockStyles) return;

  Transforms.setNodes(
    editor,
    { type },
    {
      at: editor.selection,
      mode: "highest",
      match: (n) => Editor.isBlock(editor, n),
    }
  );
};

// Link node detection
export const isOnLinkNode = (editor, selection) => {
  if (!selection) return;

  const node = Editor.above(editor, {
    at: selection,
    match: (n) => n.type === "link",
  });
  return !!node;
};

export const toggleLinkNode = (editor) => {
  if (!isOnLinkNode(editor, editor.selection)) {
    if (Range.isCollapsed(editor.selection)) {
      Transforms.insertNodes(editor, {
        type: "link",
        url: "#",
        children: [{ text: "link" }],
      });
    } else {
      Transforms.wrapNodes(
        editor,
        { type: "link", url: "#" },
        { split: true, at: editor.selection }
      );
    }
  } else {
    Transforms.unwrapNodes(editor, {
      match: (n) => Element.isElement(n) && n.type === "link",
    });
  }
};
