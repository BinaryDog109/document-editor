export const defaultDocument = [
  {
    type: "h1",
    children: [{ text: "Welcome to this editable area!" }],
  },
  {
    type: "h2",
    children: [{ text: "Welcome to this editable area!" }],
  },
  {
    type: "paragraph",
    children: [
      { text: "Hello" },
      { text: "Wow I am bold!", bold: true },
      { text: "Some text before a link." },
      {
        type: "link",
        url: "https://www.google.com",
        children: [
          { text: "Link text" },
          { text: "Bold text inside link", bold: true },
        ],
      },
      { text: " Wow I am italic!", italic: true },
      { text: "Bold and underlined text.", bold: true, underline: true },
      { text: "variableFoo", code: true },
    ],
  },
];
