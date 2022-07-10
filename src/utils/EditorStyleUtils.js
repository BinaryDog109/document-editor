import { Editor, Range, Transforms } from "slate";

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
    Editor.addMark(editor, style, true);
    console.log({ marks: Editor.marks(editor) });
  }
};


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
  let startTopNodeIndex = start.path[0];
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
