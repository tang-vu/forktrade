// Each request captures a generation. Edits, reconnects and context changes invalidate it.
export class Generation {
  private current=0;
  invalidate(){return ++this.current;}
  capture(){return this.current;}
  accepts(value:number){return value===this.current;}
}
