import styles from "./Toolbar.module.css"
export const Toolbar = () => {
  return (
    <div className={styles.toolbar}>
            <button id="bold" className="operation-button format">
                <i className="fa-solid fa-bold"></i>
            </button>
            <button id="italic" className="operation-button format">
                <i className="fa-solid fa-italic"></i>
            </button>
            <button id="underline" className="operation-button format">
                <i className="fa-solid fa-underline"></i>
            </button>
            <button id="strikethrough" className="operation-button format">
                <i className="fa-solid fa-strikethrough"></i>
            </button>

            <button id="superscript" className="operation-button script">
                <i className="fa-solid fa-superscript"></i>
            </button>
            <button id="subscript" className="operation-button script">
                <i className="fa-solid fa-subscript"></i>
            </button>
            {/* <!-- List operations --> */}
            <button id="insertOrderedList" className="operation-button">
                <i className="fa-solid fa-list-ol"></i>
            </button>
            <button id="insertUnorderedList" className="operation-button">
                <i className="fa-solid fa-list-ul"></i>
            </button>

            <button id="undo" className="operation-button">
                <i className="fa-solid fa-rotate-left"></i>
            </button>
            <button id="redo" className="operation-button">
                <i className="fa-solid fa-rotate-right"></i>
            </button>
            {/* <!-- Link operations --> */}
            <button id="createLink" className="adv-operation-button">
                <i className="fa-solid fa-link"></i>
            </button>
            <button id="unlink" className="operation-button">
                <i className="fa-solid fa-unlink"></i>
            </button>

            {/* <!-- Alignment --> */}
            <button id="justifyLeft" className="align operation-button">
                <i className="fa-solid fa-align-left"></i>
            </button>
            <button id="justifyCenter" className="align operation-button">
                <i className="fa-solid fa-align-center"></i>
            </button>
            <button id="justifyRight" className="align operation-button">
                <i className="fa-solid fa-align-right"></i>
            </button>
            <button id="justifyFull" className="align operation-button">
                <i className="fa-solid fa-align-justify"></i>
            </button>

            <button id="indent" className="spacing operation-button">
                <i className="fa-solid fa-indent"></i>
            </button>
            <button id="outdent" className="spacing operation-button">
                <i className="fa-solid fa-outdent"></i>
            </button>

            {/* <!-- Headings --> */}
            <select className="adv-operation-button" name="" id="formatBlock">
                <option value="h1">h1</option>
                <option value="h2">h2</option>
                <option value="h3">h3</option>
                <option value="h4">h4</option>
                <option value="h5">h5</option>
                <option value="h6">h6</option>
            </select>
            {/* <!-- Fonts --> */}
            <select className="adv-operation-button" name="" id="fontName">

            </select>
            <select className="adv-operation-button" name="" id="fontSize">
                
            </select>
            {/* <!-- Colors --> */}
            <div className="input-wrapper">
                <input type="color" name="" id="foreColor" className="adv-operation-button" />
                <label htmlFor="font-color">Font Color</label>
            </div>
            <div className="input-wrapper">
                <input type="color" name="" id="backColor" className="adv-operation-button" />
                <label htmlFor="highlight-color">Highlight Color</label>
            </div>
        </div>
  )
}