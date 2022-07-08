import { useState } from 'react';
import './App.css';
import { defaultDocument } from './component/defaultDocument';
import {TextEditor} from "./component/TextEditor"



function App() {
  const [document, updateDocument] = useState(defaultDocument)
  return (
    <div className="App">
      <TextEditor document={document} onChange={updateDocument} />
    </div>
  );
}

export default App;
