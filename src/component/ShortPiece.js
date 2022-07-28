export const ShortPiece = ({attributes, children, element}) => {
  return (
    <div>
        <h3 contentEditable={false}>{element.title || "Title"}</h3>
        <p>{children}</p>
    </div>
  )
}