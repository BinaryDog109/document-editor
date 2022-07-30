import { CRDTOperation } from "./CRDTOperation";
import JSONCRDT from "./JSONCRDT";




function toJSON(node){
    try {
      return JSON.parse(JSON.stringify(node))
    } catch (e) {
      console.error('Convert to js failed!!! Return null')
      return null
    }
  }
export {toJSON}