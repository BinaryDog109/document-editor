export const CRDTPlayground = ({ attributes, children, element }) => {
  return <div style={{
    border: "10px dashed black",
    padding: "10px"
  }} {...attributes}>
    <h2 style={{textAlign: "center"}} contentEditable={false}>CRDT Playground</h2>
    {children}
  </div>;
};
