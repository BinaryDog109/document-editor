import PriorityQueue from "priorityqueuejs";
import vc from "vectorclock";
import {
  executeDownstreamSingleCRDTOp,
  mapSingleOperationFromCRDT,
} from "./JSONCRDT";
import { isCausallyReady } from "./utilities";

export function initCausalOrderQueueForEditor(editor) {
  editor.causalOrderQueue = new PriorityQueue((opA, opB) => {
    return vc.descSort(opA.vectorClock, opB.vectorClock);
  });
}

/**
 *
 * @param {Function} executor
 * @param {PriorityQueue} queue
 */
export function executeCausallyRemoteOperation(editor, remoteCRDTOp, queue) {
  if (
    !isCausallyReady(
      editor.vectorClock,
      remoteCRDTOp.vectorClock,
      remoteCRDTOp.peerId
    )
  ) {
    console.log("Received non-ready operation", remoteCRDTOp);
    queue.enq(remoteCRDTOp);
  } else {
    executeDownstreamSingleCRDTOp(editor, remoteCRDTOp);
    const slateOps = mapSingleOperationFromCRDT(editor, remoteCRDTOp);
    slateOps.forEach((op) => {
      editor.apply(op);
    });
    while (
      !queue.isEmpty() &&
      isCausallyReady(
        editor.vectorClock,
        queue.peek().vectorClock,
        queue.peek().peerId
      )
    ) {
      const nextOp = queue.deq();
      executeDownstreamSingleCRDTOp(editor, nextOp);
      const slateOps = mapSingleOperationFromCRDT(editor, nextOp);
      slateOps.forEach((op) => {
        editor.apply(op);
      });
    }
  }
}
