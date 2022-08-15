import { Editor, Node, Path } from "slate";
import { CharacterNode } from "./CharacterNode";
import vc from "vectorclock";

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
    // console.log({remoteValue, localValue, key, remoteClockId})
    if (remoteValue > localValue) return false;
  }

  if (remoteClockOwnValue > localClockRecordedRemoteClockValue) return true;
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
  chNode.id = `${sum}-${editor.peerId}`;
}

/**
 *
 * @param {CharacterNode} otherCharNode
 */
export function isLargerThanForCharacterNode(chNode, otherCharNode) {
  const thisIdArray = chNode.id.split("-");
  const otherIdArray = otherCharNode.id.split("-");
  const isNumLarger = Number(thisIdArray[0]) > Number(otherIdArray[0]);
  const isStrLarger = thisIdArray[1] > otherIdArray[1];
  return (
    isNumLarger ||
    (Number(thisIdArray[0]) === Number(otherIdArray[0]) && isStrLarger)
  );
}

export function findParagraphEntryFromId(editor, paragraphId) {
  console.log("Searching paragraph ", paragraphId);
  const [nodeEntry] = Editor.nodes(editor, {
    match: (n) => isOneOfParagraphTypes(n) && n.id === paragraphId,
    mode: "highest",
    at: [],
  });

  return nodeEntry;
}

export function findTextPathFromActualOffsetOfParagraphPath(
  editor,
  paragraphPath,
  visibleIndex,
  isDeletingNode
) {
  // console.log("actual index: ", visibleIndex);
  const [paragraphNode] = Editor.node(editor, paragraphPath);
  let offsetMark = visibleIndex;
  let textPath = [...paragraphPath, 0]; // From the first text node
  const textsGenerator = Node.texts(paragraphNode);
  for (let [textNode, relativePath] of textsGenerator) {
    console.log(
      "looping through text nodes: ",
      offsetMark,
      { textNodeText: textNode.text },
      relativePath
    );
    const textLength = textNode.text.length;
    if (offsetMark - textLength > 0) {
      offsetMark -= textLength;
      continue;
    } else if (offsetMark === textLength && isDeletingNode) {
      // Only when deleting a node, do we need to return the next text node if offsetMark === textLength
      offsetMark -= textLength;
      textPath.pop();
      textPath = textPath.concat(relativePath);
      textPath[textPath.length - 1] += 1;
      return [textPath, offsetMark];
    } else {
      // Found our text node and index
      textPath.pop();
      textPath = textPath.concat(relativePath);
      return [textPath, offsetMark];
    }
  }
}

export const isOneOfParagraphTypes = (node) => {
  return (
    node.type === "paragraph" ||
    node.type === "h1" ||
    node.type === "h2" ||
    node.type === "h3" ||
    node.type === "h4" ||
    node.type === "h5"
  );
};

export const findParagraphIdAt = (editor, path) => {
  const [paragraph] = Editor.above(editor, {
    match: (n) => isOneOfParagraphTypes(n),
    at: path,
  });
  return paragraph.id;
};

export const isParagraphRGAEmpty = (rga) => {
  return rga.list.tombStoneCount === rga.list.size;
};

export const findParagraphNodeEntryAt = (editor, path) => {
  try {
    const entry = Editor.above(editor, {
      match: (n) => isOneOfParagraphTypes(n),
      at: path,
    });
    return entry;
  } catch (error) {
    // If deleting a node instead of text from a paragraph
    path = [path[0]];
    const [entry] = Editor.nodes(editor, {
      match: (n) => isOneOfParagraphTypes(n),
      at: path,
    });
    return entry;
  }
};

export function executeSlateOp(editor, slateOp) {
  if (slateOp.group) {
    Editor.withoutNormalizing(editor, () => {
      slateOp.ops.forEach((op) => {
        editor.apply(op);
      });
    });
  } else if (slateOp.withoutNorm) {
    Editor.withoutNormalizing(editor, () => {
      editor.apply(slateOp);
    });
  } else editor.apply(slateOp);
}

export const findActualOffsetFromParagraphAt = (
  editor,
  point,
  positionAfterMerged
) => {
  const [paragraph, path] = findParagraphNodeEntryAt(editor, point.path);

  const generator = Node.texts(paragraph);

  let offset = point.offset;
  let currentNodeLen = 0;
  for (const [node, path] of generator) {
    // console.log({node, path, compareTo: Path.compare(path, [point.path[point.path.length - 1]]), offset})
    // The path is relative, so we just compare the last number of a path
    // If the text node is before our text node
    if (Path.compare(path, [point.path[point.path.length - 1]]) === -1) {
      currentNodeLen = Node.string(node).length;
      offset += currentNodeLen;
    }
  }
  if (positionAfterMerged) {
    offset -= currentNodeLen;
    offset += positionAfterMerged;
  }
  return offset;
};

export const appendRGAList = (
  rga,
  newRGAHead,
  editor,
  fromLocal,
  remotePeerId
) => {
  const insertedCharacters = []
  let current = newRGAHead;
  while (current != null) {
    if (!current.data.isTombStoned) {
      if (fromLocal) {
        // increase local vector clock
        vc.increment(editor.vectorClock, editor.peerId);
      }
      const peerId = fromLocal ? editor.peerId : remotePeerId;
      const characterNode = new CharacterNode(current.data.char, peerId);
      setCharacterId(characterNode, editor);
      rga.list.insert(characterNode);
      rga.chracterLinkedNodeMap.set(characterNode.id, current);
      insertedCharacters.push({...characterNode})
    }
    current = current.next;
  }
  return insertedCharacters
};
export const deleteRGANodesUntil = (removeStop, rga) => {
  let deletedLinkedNode = rga.list.tail;
  while (deletedLinkedNode !== removeStop) {
    // Mark nodes after the splitting position to be deleted
    if (!deletedLinkedNode.data.isTombStoned) {
      deletedLinkedNode.data.isTombStoned = true;
      rga.list.tombStoneCount++;
    }

    deletedLinkedNode = deletedLinkedNode.prev;
  }
};
