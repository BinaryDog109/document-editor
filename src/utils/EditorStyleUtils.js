import { Editor } from "slate";

export const getActiveStyles = editor => {
    return new Set(Object.keys(Editor.marks(editor) || {}))
}

export const isStyleActive = (editor, style) => getActiveStyles(editor).has(style)

export const toggleStyle = (editor, style) => {
    const currentStyles = getActiveStyles(editor)
    if (currentStyles.has(style)) {
        Editor.removeMark(editor, style)
    }
    else {
        // console.log("adding " + style)
        Editor.addMark(editor, style, true)
        console.log({marks: Editor.marks(editor)})
    }
}