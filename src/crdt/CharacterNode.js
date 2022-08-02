export class CharacterNode {
  constructor(char, id) {
    this.char = "" || char;
    if (id !== undefined) this.id = id;
    this.isTombStoned = false;
  }
}
