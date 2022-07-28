import isUrl from "is-url";
import { Editor, Element, Point, Range, Text, Transforms } from "slate";

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
    if (style === "superscript") Editor.removeMark(editor, "subscript");
    if (style === "subscript") Editor.removeMark(editor, "superscript");
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

  if (selection == null) {
    return false;
  }

  return (
    Editor.above(editor, {
      at: selection,
      match: (n) => n.type === "link",
    }) != null
  );
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
        { split: true }
      );
    }
  } else {
    Transforms.unwrapNodes(editor, {
      match: (n) => Element.isElement(n) && n.type === "link",
    });
  }
};

// Link text detection
export const detectLinkText = (editor) => {
  if (!editor.selection || !Range.isCollapsed(editor.selection)) return;
  if (isOnLinkNode(editor, editor.selection)) return;

  const [node, path] = Editor.node(editor, editor.selection);
  // Is it neccesary?
  if (!Text.isText(node)) return;

  const cursorPoint = editor.selection.anchor;
  const pointOfLastCharacter = Editor.before(editor, editor.selection, {
    unit: "character",
  });
  const lastChar = Editor.string(
    editor,
    Editor.range(editor, pointOfLastCharacter, cursorPoint)
  );
  if (lastChar !== " ") return;
  // Look for the last word before space
  // ! We cannot use Editor.before(...{unit: 'word'}) because it will look for words separated by '.' as well.
  // const wordStartingPoint = Editor.before(editor, pointOfLastCharacter, {unit: "word"})
  //  When a new link node gets created, the document changes and will run detectLinkText again. 
  //  We must need startOfTextNode because it can avoid duplicated link node assignment in that case.
  const startOfTextNode = Editor.point(editor, path, {
    edge: "start",
  });
  let start = Editor.before(editor, pointOfLastCharacter, {
    unit: "character",
  });
  let end = pointOfLastCharacter;
  while (
    Editor.string(editor, Editor.range(editor, start, end)) !== " " &&
    !Point.isBefore(start, startOfTextNode)
  ) {
    end = start;
    start = Editor.before(editor, end, { unit: "character" });
  }
  const lastWordRange = Editor.range(editor, end, pointOfLastCharacter);
  const lastWord = Editor.string(editor, lastWordRange);
  // If lastWord is a url, convert it into a link node
  if (isUrl(lastWord)) {
    console.log(lastWord);
    Promise.resolve().then(() => {
      Transforms.wrapNodes(
        editor,
        { type: "link", url: lastWord, children: [{ text: lastWord }] },
        { split: true, at: lastWordRange }
      );
    });
  }
};
