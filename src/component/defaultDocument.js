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
    type: "paragraph", name: "yty",
    children: [
      { text: "Hello, I am normal text. " },
      { text: "Wow I am bold! ", bold: true },
      { text: "Some text before a link. " },
      {
        type: "link",
        url: "https://www.google.com", name: "yty",
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
];
