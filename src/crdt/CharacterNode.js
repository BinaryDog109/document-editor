export class CharacterNode {
    constructor(char, peerId, vectorClock) {
        this.char = '' || char
        this.peerId = peerId
        this.vectorClock = {clock: {}} || vectorClock
        this.isTombStoned = false
    }
    toString() {
        return this.char
    }
    getId() {
        // An id is sum of the vector clock + peerId
        const {clock} = this.vectorClock
        let sum = 0
        Object.keys(clock).forEach(peerId => {
            sum += clock[peerId]
        })
        return `${sum}-${this.peerId}`
    }
    setTombStoned() {
        this.isTombStoned = true
    }
}