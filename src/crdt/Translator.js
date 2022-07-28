import { CRDTOperation } from "./CRDTOperation";
import JSONCRDT from "./JSONCRDT";

/**
 * 
 * @param {BaseEditor.operations} operations 
 * @param {JSONCRDT} crdt 
 * @param {RTCDataChannel} dataChannel 
 */
const fromSlateToCRDTOperations = (operations, crdt, dataChannel) => {
  operations.forEach((slateOp) => {
    const { type, offset, path, text } = slateOp;
    switch (type) {
      case "insert_node":
        const num = Number(text)
        const op = crdt.setCountCommand(num)
        sendOp(op, dataChannel)
        break;
      default:
        return;
    }
  });
};

/**
 * 
 * @param {CRDTOperation} op 
 * @param {RTCDataChannel} dataChannel 
 */
const sendOp = (op, dataChannel) => {
    dataChannel.send(toJS(op))
}

function toJS(node){
    try {
      return JSON.parse(JSON.stringify(node))
    } catch (e) {
      console.error('Convert to js failed!!! Return null')
      return null
    }
  }