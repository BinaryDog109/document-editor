import { useRef, useState } from "react";
import "./App.css";
import { defaultDocument } from "./component/defaultDocument";
import { Navbar } from "./component/Navbar";
import { TextEditor } from "./component/TextEditor";

function App() {
  const [document, updateDocument] = useState(defaultDocument);
  const editorRef = useRef(null)
  return (
    <div className="App">
      <Navbar />
      <div className="grid editor" ref={editorRef}>
        <TextEditor editorRef={editorRef} document={document} onChange={updateDocument} />
      </div>
    </div>
  );
}

export default App;
