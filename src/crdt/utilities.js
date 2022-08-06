import { Editor, Node, Path } from "slate";

// Helper function that helps generate all unique keys from two clocks
export function allKeys(a, b) {
  var last = null;
  return Object.keys(a)
    .concat(Object.keys(b))
    .sort()
    .filter(function (item) {
      // to make a set of sorted keys unique, just check that consecutive keys are different
      var isDuplicate = item == last;
      last = item;
      return !isDuplicate;
    });
}
 
// The algorithm that ensure one clock is causally ready when sending to the other.
export const isCausallyReady = (localClock, remoteClock, remoteClockId) => {
  // allow this function to be called with objects that contain clocks, or the clocks themselves
  if (localClock.clock) localClock = localClock.clock;
  if (remoteClock.clock) remoteClock = remoteClock.clock;
  const remoteClockOwnValue = remoteClock[remoteClockId] || 0;
  const localClockRecordedRemoteClockValue = localClock[remoteClockId] || 0;
  const keys = allKeys(localClock, remoteClock);

  for (let key of keys) {
    if (key === remoteClockId) continue;
    const localValue = localClock[key] || 0;
    const remoteValue = remoteClock[key] || 0;

    if (remoteValue > localValue) return false;
  }
  if (remoteClockOwnValue > localClockRecordedRemoteClockValue)
    return true;
  else return false;
};

  /** Overwrite JSON.stringify so that it wont stringify our circular references in the doubly linked list */
  // Seems to be uneccesary after setting the doubly linked list property to unenumerable.
  // let original = JSON.stringify;
  // JSON.stringify = function (item, replacer, space) {
  //   console.log({item})
  //   const items = item;
  //   const newItems = [];
  //   items.forEach((element) => {
  //     const newElem = { ...element };
  //     if (element.type === "paragraph" && element.rga) {
  //       delete newElem["rga"];
  //     }
  //     newItems.push(newElem);
  //   });

  //   return original(newItems, replacer, space);
  // };

// CharacterNode Helpers

export function setCharacterId(chNode, editor) {
  // An id is sum of the vector clock + peerId
  const { clock } = editor.vectorClock;
  let sum = 0;
  Object.keys(clock).forEach((peerId) => {
    sum += clock[peerId];
  });
  chNode.id = `${sum}-${editor.peerId}`
}

/**
 *
 * @param {CharacterNode} otherCharNode
 */
export function isLargerThanForCharacterNode(chNode, otherCharNode) {
  const thisIdArray = (chNode).id.split("-");
  const otherIdArray = (otherCharNode).id.split("-");
  const isNumLarger = Number(thisIdArray[0]) > Number(otherIdArray[0]);
  const isStrLarger = thisIdArray[1] > otherIdArray[1];
  return (
    isNumLarger ||
    (Number(thisIdArray[0]) === Number(otherIdArray[0]) && isStrLarger)
  );
}

export function findTextPathFromActualOffsetOfParagraphPath(
  editor,
  paragraphPath,
  visibleIndex
) {
  console.log("actual index: ", visibleIndex);
  const [paragraphNode] = Editor.node(editor, paragraphPath);
  let offsetMark = visibleIndex;
  let textPath = [...paragraphPath, 0]; // From the first text node
  const textsGenerator = Node.texts(paragraphNode);
  for (let [textNode, relativePath] of textsGenerator) {
    console.log("looping through text nodes: ", textNode.text, relativePath);
    const textLength = textNode.text.length;
    if (offsetMark - textLength > 0) {
      offsetMark -= textLength;
      continue;
    } else {
      // Found our text node and index
      textPath.pop();
      textPath = textPath.concat(relativePath);
      return [textPath, offsetMark];
    }
  }
}



export const findParagraphNodeEntryAt = (editor, path) => {
  const entry = Editor.above(editor, {
    match: (n) => n.type === "paragraph",
    at: path,
  });
  return entry;
};

export const findActualOffsetFromParagraphAt = (editor, point) => {
  const [paragraph, path] = findParagraphNodeEntryAt(editor, point.path);

  const generator = Node.texts(paragraph);

  let offset = point.offset;
  for (const [node, path] of generator) {
    // The path is relative, so we just compare the last number of a path
    // If the text node is before our text node
    if (Path.compare(path, [point.path[point.path.length - 1]]) === -1) {
      offset += Node.string(node).length;
    }
  }
  return offset;
};