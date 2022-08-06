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
// Below functions are for testing
export function simplifiedCausallyOrder(
  localObject,
  remoteOperaton,
  queue
) {
  if (
    !isCausallyReady(
      localObject.vectorClock,
      remoteOperaton.vectorClock,
      remoteOperaton.peerId
    )
  ) {
    console.log("Received non-ready operation", remoteOperaton);
    queue.enq(remoteOperaton);
  } else {
    console.log("Exuceting ", remoteOperaton);
    localObject.vectorClock = vc.merge(localObject.vectorClock, remoteOperaton.vectorClock);
    vc.increment(localObject.vectorClock, localObject.peerId);
    
    while (
      !queue.isEmpty() &&
      isCausallyReady(
        localObject.vectorClock,
        queue.peek().vectorClock,
        queue.peek().peerId
      )
    ) {
      const nextOp = queue.deq();
      console.log("Exuceting from queue ", nextOp);
      localObject.vectorClock = vc.merge(localObject.vectorClock, nextOp.vectorClock);
      vc.increment(localObject.vectorClock, localObject.peerId);
      console.log("At this step: ", localObject.vectorClock)
    }
  }
}
export function testCausallyOrder() {
  console.log("Start testing");
  const localObject = { peerId: "c", vectorClock: { clock: {c:1} } };
  const queue = new PriorityQueue((opA, opB) => {
    return vc.descSort(opA.vectorClock, opB.vectorClock);
  });
  
  simplifiedCausallyOrder(
    localObject,
    {
      peerId: "a",
      vectorClock: { clock: { a: 5, b: 2, c: 1 } },
    },
    queue
  );
  simplifiedCausallyOrder(
    localObject,
    {
      peerId: "b",
      vectorClock: { clock: { a: 1, b: 2, c: 0 } },
    },
    queue
  );
  simplifiedCausallyOrder(
    localObject,
    {
      peerId: "a",
      vectorClock: { clock: { a: 3, b: 2, c: 0 } },
    },
    queue
  );
  simplifiedCausallyOrder(
    localObject,
    {
      peerId: "b",
      vectorClock: { clock: { a: 3, b: 5, c: 1 } },
    },
    queue
  );
  simplifiedCausallyOrder(
    localObject,
    {
      peerId: "a",
      vectorClock: { clock: { a: 1, b: 0, c: 0 } },
    },
    queue
  );
  console.log("After: ", localObject.vectorClock);
}
