export const defaultDocument = [
  {
    type: "h1",
    children: [{ text: "Welcome user!" }],
  },
  {
    type: "h2",
    children: [{ text: "Welcome user!" }],
  },
  {
    type: "h3",
    children: [{ text: "Welcome user!" }],
  },
  {
    type: "h4",
    children: [{ text: "Welcome user!" }],
  },
  {
    type: "paragraph",
    children: [
      { text: "Hello, I am normal text. " },
      { text: "Wow I am bold! ", bold: true },
      { text: "Some text before a link. " },
      {
        type: "link",
        url: "https://www.google.com",
        children: [
          { text: "Link text, " },
          { text: "Bold text inside link. ", bold: true },
        ],
      },
      { text: " Wow I am italic! ", italic: true },
      { text: "Bold and underlined text. ", bold: true, underline: true },
      { text: "variableFoo", code: true },
      { text: "is a variable. " },
    ],
  },
  {
    type: "img",
    url: "https://images.unsplash.com/photo-1657391292533-06f714e2d286?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80",
    caption: "Stuff",
    // Void elem needs to have some chilren for SlateJS to treat it as a selection point. Otherwise it will throw an error
    children: [{text: ''}]
  },
  {
    type: "paragraph",
    children: [{text: ''}]
  }
];
