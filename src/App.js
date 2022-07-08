import { useState } from "react";
import "./App.css";
import { defaultDocument } from "./component/defaultDocument";
import { Navbar } from "./component/Navbar";
import { TextEditor } from "./component/TextEditor";
import { Toolbar } from "./component/Toolbar";

function App() {
  const [document, updateDocument] = useState(defaultDocument);
  return (
    <div className="App">
      <Navbar />
      <Toolbar />
      <div className="grid">
        <TextEditor document={document} onChange={updateDocument} />
      </div>
    </div>
  );
}

export default App;
