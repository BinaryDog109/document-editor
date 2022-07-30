export class CharacterNode {
    constructor(char, peerId, vectorClock, isTombStoned, next) {
        this.char = '' || char
        this.peerId = peerId
        this.vectorClock = [] || vectorClock
        this.isTombStoned = false || isTombStoned
        this.next = null || next
    }
    toString() {
        return this.char
    }
}