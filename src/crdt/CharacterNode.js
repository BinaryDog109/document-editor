export class CharacterNode {
    constructor(char, peerId, vectorClock) {
        this.char = '' || char
        this.peerId = peerId
        this.vectorClock = {clock: {}} || vectorClock
        this.isTombStoned = false
    }
}