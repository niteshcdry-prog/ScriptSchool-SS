export type CourseDefinition = {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  estimatedMinutes: number;
  recommendedPrerequisites: string[];
  learningOutcomes: string[];
};

export type CurriculumLesson = {
  id: string;
  title: string;
  category: string;
  icon: string;
  duration: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  description: string;
  explanation: string;
  code: string;
  quiz: string;
  options: string[];
  answer: number;
  tip: string;
  practicePrompt: string;
  practiceStarter: string;
  practiceHint: string;
  practiceSolution: string;
  quizExplanation: string;
};

export type CourseModule = {
  id: string;
  title: string;
  courseId: string;
  sortOrder: number;
};

type LessonDraft = Omit<CurriculumLesson, "category" | "icon">;
type ModuleDraft = Omit<CourseModule, "courseId"> & { lessons: LessonDraft[] };
type CurriculumDraft = { course: CourseDefinition; modules: ModuleDraft[] };

function lesson(
  id: string,
  title: string,
  duration: number,
  level: CurriculumLesson["level"],
  description: string,
  explanation: string,
  code: string,
  quiz: string,
  options: [string, string, string],
  answer: number,
  tip: string,
  practicePrompt: string,
  practiceStarter: string,
  practiceHint: string,
  practiceSolution: string,
  quizExplanation: string,
): LessonDraft {
  return {
    id, title, duration, level, description, explanation, code, quiz, options, answer,
    tip, practicePrompt, practiceStarter, practiceHint, practiceSolution, quizExplanation,
  };
}

const curriculumDrafts: CurriculumDraft[] = [
  {
    course: {
      id: "python-programming",
      title: "Python Programming: Beginner to Practical",
      description: "Learn Python from your first print statement through data structures, functions, files, error handling, and a small command-line project. Each lesson pairs a clear explanation with a worked example, a knowledge check, and a hands-on task.",
      language: "python",
      level: "Beginner to Intermediate",
      estimatedMinutes: 180,
      recommendedPrerequisites: [],
      learningOutcomes: [
        "Read and write Python expressions, variables, strings, numbers, and Boolean conditions.",
        "Use loops and built-in collections to process structured data.",
        "Design reusable functions and handle common runtime errors.",
        "Read and write text files safely and organize a small program into clear steps.",
        "Build and explain a command-line study tracker using core Python."
      ],
    },
    modules: [
      {
        id: "python-start-here", title: "Python essentials", sortOrder: 1,
        lessons: [
          lesson("py-first-program", "Your first Python program", 12, "Beginner", "Meet Python, run a script, and display a useful message.",
            "Python executes statements from top to bottom. The print function writes a readable value to the terminal. Text is written inside matching quotes, and comments beginning with # are notes for people reading the code.",
            "print(\"Hello, learner!\")\n# Python runs this file from top to bottom",
            "Which Python function displays a value in the terminal?", ["print()", "console.log()", "echo()"], 0,
            "Run the same file twice after changing its message so you can see the edit take effect.",
            "Print a welcome message that includes the name of your course.", "print(\"\")", "Replace the empty string with your own text.", "print(\"Welcome to Python!\")",
            "print() is Python's built-in output function. console.log() is JavaScript, and echo is commonly a shell command."),
          lesson("py-variables-types", "Variables and basic types", 14, "Beginner", "Store values with clear names and distinguish text, numbers, and Boolean values.",
            "Assignment binds a name to a value. Python does not require a declaration keyword: use = to assign. Strings hold text, integers and floats hold numbers, and bool values are True or False. Names are case-sensitive.",
            "student = \"Mina\"\nlessons_finished = 3\nis_enrolled = True\nprint(student, lessons_finished, is_enrolled)",
            "Which value is a Boolean in Python?", ["\"False\"", "False", "0.0"], 1,
            "Choose names that explain what a value represents, and remember that the Boolean literals begin with capitals.",
            "Create variables for a book title, its page count, and whether you have finished it.", "title = \"\"\npages = 0\nfinished = False",
            "Use a quoted string, an integer, and either True or False.", "title = \"The Python Book\"\npages = 240\nfinished = False",
            "False without quotes is a Boolean; \"False\" is ordinary text."),
          lesson("py-strings-numbers", "Strings and number operations", 13, "Beginner", "Combine useful text and calculate with integer and floating-point values.",
            "The + operator adds numbers but joins strings. Convert between types explicitly with int(), float(), or str() when needed. An f-string evaluates expressions inside braces and is often the clearest way to format output.",
            "price = 12.5\nquantity = 2\ntotal = price * quantity\nprint(f\"Total: ${total:.2f}\")",
            "What does an f-string let you do?", ["Insert expressions into formatted text", "Repeat a loop automatically", "Create a list of files"], 0,
            "When formatting currency, format the numeric value to two decimal places.",
            "Calculate the total cost of three notebooks that each cost 4.50.", "price = 4.50\nquantity = 3\n# calculate and display total",
            "Multiply price by quantity, then place the result inside an f-string.", "total = price * quantity\nprint(f\"Total: ${total:.2f}\")",
            "An f-string inserts evaluated expressions into a string; it does not change control flow."),
          lesson("py-conditionals", "Make decisions with conditionals", 13, "Beginner", "Choose which code runs by testing conditions with if, elif, and else.",
            "Python runs an indented block when its if condition is true. elif checks another condition only when earlier conditions failed; else handles the remaining cases. Indentation is part of Python syntax, so keep each block consistently indented.",
            "score = 82\nif score >= 90:\n    result = \"excellent\"\nelif score >= 60:\n    result = \"pass\"\nelse:\n    result = \"try again\"\nprint(result)",
            "When does an else block run?", ["When its condition is true", "When no earlier branch matched", "Before the if branch"], 1,
            "Test boundary values such as 59, 60, and 90 to check that your branches cover the intended ranges.",
            "Classify a temperature as cold below 10, mild from 10 through 24, and warm at 25 or above.", "temperature = 18\n# assign a label using if / elif / else",
            "Check the highest threshold first, then the lower threshold.", "if temperature >= 25:\n    label = \"warm\"\nelif temperature >= 10:\n    label = \"mild\"\nelse:\n    label = \"cold\"",
            "else is the fallback branch after all preceding if/elif conditions evaluated false."),
        ],
      },
      {
        id: "python-data-and-functions", title: "Collections and reusable functions", sortOrder: 2,
        lessons: [
          lesson("py-loops", "Repeat work with loops", 14, "Beginner", "Use for and while loops to repeat a clear block of work.",
            "A for loop visits each item from an iterable, such as a list or range. range(stop) produces values starting at zero and stopping before stop. A while loop repeats as long as its condition stays true, so update its state to avoid an infinite loop.",
            "for number in range(1, 4):\n    print(number)\n\ncountdown = 3\nwhile countdown > 0:\n    print(countdown)\n    countdown -= 1",
            "What is the final value produced by range(1, 4)?", ["4", "3", "The values stop before 4"], 2,
            "Prefer a for loop when the items or number of repetitions are already known.",
            "Print each item from a list of three study topics.", "topics = [\"variables\", \"loops\", \"functions\"]\n# print every topic",
            "Use for topic in topics: and indent the print statement.", "for topic in topics:\n    print(topic)",
            "range(1, 4) produces 1, 2, and 3; its stop value is excluded."),
          lesson("py-lists-dicts", "Lists and dictionaries", 15, "Beginner", "Choose a list for ordered items and a dictionary for named values.",
            "Lists keep an ordered sequence and allow indexed access starting at zero. Dictionaries map unique keys to values. Use append() to add to a list and square brackets with a key to read or update a dictionary entry.",
            "topics = [\"loops\", \"functions\"]\ntopics.append(\"files\")\nlearner = {\"name\": \"Sam\", \"completed\": 2}\nlearner[\"completed\"] += 1",
            "Which structure is designed to look up a value by a named key?", ["List", "Dictionary", "Range"], 1,
            "Use descriptive string keys for records, and check that a key exists before reading optional data.",
            "Store a learner's name and score in a dictionary, then add one point.", "learner = {\"name\": \"Ari\", \"score\": 4}\n# add a point",
            "Update the value associated with the score key.", "learner[\"score\"] += 1",
            "A dictionary maps keys to values; a list is an ordered sequence indexed by position."),
          lesson("py-functions", "Write reusable functions", 15, "Beginner", "Package a named task into a function with parameters and a return value.",
            "def defines a function. Parameters name the inputs, and return sends a result back to the caller. A function that only prints is harder to reuse in calculations; return a value when another part of the program may need it.",
            "def minutes_to_seconds(minutes):\n    return minutes * 60\n\nstudy_time = minutes_to_seconds(25)\nprint(study_time)",
            "What does return do in a function?", ["Sends a result to the caller", "Prints a result automatically", "Repeats the function"], 0,
            "Keep one function focused on one task and choose a name that describes its result.",
            "Write a function that returns the average of two numbers.", "def average(left, right):\n    # return the mean",
            "Add the values, then divide their sum by two.", "def average(left, right):\n    return (left + right) / 2",
            "return gives the computed value back to the caller; print only writes it to the terminal."),
          lesson("py-errors", "Handle errors and validate input", 15, "Intermediate", "Recognize common errors and handle expected failures without hiding bugs.",
            "A SyntaxError means Python cannot parse the program; a NameError often means a name is misspelled or unavailable. Use try/except around an operation that can reasonably fail, catch a specific exception, and provide a useful recovery path rather than suppressing every error.",
            "raw_count = \"3\"\ntry:\n    count = int(raw_count)\nexcept ValueError:\n    count = 0\nprint(count)",
            "Why should an except clause name the expected exception?", ["So unrelated programming errors are not silently hidden", "So Python retries forever", "So the try block is skipped"], 0,
            "Catch only errors you can recover from and report what the user can do next.",
            "Convert a text value to an integer, using zero when it contains invalid digits.", "raw_value = \"many\"\n# convert safely",
            "Wrap int(raw_value) in try/except ValueError and assign a fallback.", "try:\n    value = int(raw_value)\nexcept ValueError:\n    value = 0",
            "A specific exception handler prevents unrelated errors from being mistaken for expected bad input."),
        ],
      },
      {
        id: "python-small-projects", title: "Files and a small project", sortOrder: 3,
        lessons: [
          lesson("py-files", "Read and write text files safely", 15, "Intermediate", "Use Python's with statement to work with text files and close them reliably.",
            "open() returns a file object. Use a with block so the file is closed even if an error occurs. Read mode is for existing content; write mode replaces a file, while append mode adds content. Specify encoding for predictable text handling.",
            "with open(\"notes.txt\", \"w\", encoding=\"utf-8\") as notes:\n    notes.write(\"Practice a little every day.\\n\")\n\nwith open(\"notes.txt\", encoding=\"utf-8\") as notes:\n    print(notes.read())",
            "What benefit does the with statement provide for files?", ["It closes the file reliably when the block ends", "It encrypts the file", "It creates a database"], 0,
            "Use append mode when adding a new line without replacing existing notes.",
            "Append one study reminder to a text file using UTF-8.", "reminder = \"Review functions\"\n# open reminders.txt in append mode",
            "Use with open(..., \"a\", encoding=\"utf-8\") and write the reminder followed by a newline.", "with open(\"reminders.txt\", \"a\", encoding=\"utf-8\") as file:\n    file.write(reminder + \"\\n\")",
            "with manages the file resource and closes it after the indented block exits."),
          lesson("py-modules", "Organize code into modules", 14, "Intermediate", "Split reusable code into Python modules and import only what a file needs.",
            "A Python module is a .py file. Import a module to reuse its functions and constants. Keep runnable entry-point behavior behind if __name__ == \"__main__\" so importing the file does not unexpectedly start the application.",
            "from math import ceil\n\ndef pages_needed(words, words_per_page):\n    return ceil(words / words_per_page)\n\nif __name__ == \"__main__\":\n    print(pages_needed(950, 250))",
            "Why guard a script with if __name__ == \"__main__\"?", ["To run entry-point code only when the file is executed directly", "To make every variable global", "To install the file as a package"], 0,
            "Put reusable functions in modules and keep command-line startup separate from definitions.",
            "Create a helper that rounds a total up to the next whole page, then call it only when the script runs directly.", "from math import ceil\n\ndef pages_needed(words, words_per_page):\n    # return the rounded-up page count\n    pass",
            "Use ceil(words / words_per_page) and put the print call inside the main guard.", "from math import ceil\n\ndef pages_needed(words, words_per_page):\n    return ceil(words / words_per_page)\n\nif __name__ == \"__main__\":\n    print(pages_needed(950, 250))",
            "The main guard distinguishes importing definitions from running the script as a program."),
          lesson("py-study-tracker", "Capstone: build a study tracker", 18, "Intermediate", "Combine functions, collections, validation, and file storage in a small command-line tracker.",
            "A small project is easier to reason about when each function has one responsibility: validate a topic, add it to a collection, summarize totals, and save or load data. Begin with in-memory data, then persist a simple text or JSON file and test both valid and invalid inputs.",
            "def add_topic(topics, name):\n    clean_name = name.strip()\n    if not clean_name:\n        raise ValueError(\"Topic name cannot be empty\")\n    topics.append(clean_name)\n\n\ntopics = [\"functions\"]\nadd_topic(topics, \"file handling\")\nprint(f\"Topics: {len(topics)}\")",
            "Which design makes the study tracker easiest to test and extend?", ["One function that reads input, edits files, and prints everything", "Small functions with clear inputs and results", "Global variables changed from every function"], 1,
            "Test empty input, whitespace-only names, a new topic, and saving an empty tracker.",
            "Add a summary function that returns the number of topics and the names joined on commas.", "def summarize(topics):\n    # return a concise summary",
            "Use len(topics) and \", \".join(topics); return the string instead of printing inside the helper.", "def summarize(topics):\n    return f\"{len(topics)} topics: {', '.join(topics)}\"",
            "Small functions with explicit inputs are easier to validate, test, and reuse."),
        ],
      },
    ],
  },
  {
    course: {
      id: "web-development",
      title: "Web Development: HTML, CSS & Responsive Design",
      description: "Build the browser foundations behind modern websites. Create semantic pages, style them with CSS, use flexible layouts and responsive breakpoints, and finish with an accessible multi-section page that works on phones and desktops.",
      language: "html-css",
      level: "Beginner",
      estimatedMinutes: 180,
      recommendedPrerequisites: [],
      learningOutcomes: [
        "Structure pages with semantic HTML, links, images, and accessible form labels.",
        "Style readable interfaces with selectors, the box model, typography, and color.",
        "Compose responsive layouts with Flexbox, Grid, and mobile-first media queries.",
        "Check keyboard navigation, contrast, and page behavior at multiple viewport sizes.",
        "Build and evaluate a small responsive website using browser developer tools."
      ],
    },
    modules: [
      {
        id: "web-html-foundations", title: "Semantic HTML", sortOrder: 1,
        lessons: [
          lesson("web-document-structure", "Structure a page with HTML", 13, "Beginner", "Create a valid document and give its content a meaningful heading structure.",
            "HTML describes content and its meaning. A document begins with a doctype and contains html, head, and body elements. Use headings in a logical hierarchy, and choose semantic elements such as main, header, and footer when they describe the page regions.",
            "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Study journal</title>\n  </head>\n  <body>\n    <main>\n      <h1>Study journal</h1>\n      <p>Small steps add up.</p>\n    </main>\n  </body>\n</html>",
            "Which element should contain the page's primary, unique content?", ["<main>", "<span>", "<br>"], 0,
            "Use one clear h1 for the page topic and nest section headings in a logical order.",
            "Add a header, a main section with a heading, and a footer to a simple HTML document.", "<body>\n  <!-- add page regions -->\n</body>",
            "Use semantic elements to describe the header, primary content, and footer.", "<body>\n  <header><p>Study journal</p></header>\n  <main><h1>Weekly plan</h1></main>\n  <footer><small>Keep learning</small></footer>\n</body>",
            "<main> identifies the dominant content, while span is a generic inline wrapper and br inserts a line break."),
          lesson("web-links-images", "Links and images with meaning", 13, "Beginner", "Connect pages and add images with descriptive, accessible text.",
            "An anchor with href creates a link; its visible wording should explain the destination. An img uses src for the asset and alt for a text alternative. Decorative images should have empty alt text so screen readers can skip them.",
            "<a href=\"/courses\">Explore courses</a>\n<img src=\"study-desk.jpg\" alt=\"Notebook and laptop on a desk\">",
            "What should alt text communicate for an informative image?", ["Its file name", "The useful information the image conveys", "A list of every pixel color"], 1,
            "Write link text that still makes sense when read out of context, and keep alt text concise.",
            "Add a link to a resources page and a descriptive image of a classroom.", "<!-- add an anchor and an image -->",
            "Give the anchor an href and the image both src and useful alt text.", "<a href=\"/resources\">Open study resources</a>\n<img src=\"classroom.jpg\" alt=\"Students working together in a classroom\">",
            "Alternative text communicates the image's meaningful information, not its file name or visual implementation."),
          lesson("web-forms", "Build accessible HTML forms", 14, "Beginner", "Use labels, appropriate input types, and built-in constraints for reliable forms.",
            "A label connected with for and an input id gives the control an accessible name. Choose input types such as email when they match the data. Required and min/max constraints provide basic browser validation, but helpful instructions and server-side validation are still important.",
            "<form>\n  <label for=\"email\">Email address</label>\n  <input id=\"email\" name=\"email\" type=\"email\" required>\n  <button type=\"submit\">Join</button>\n</form>",
            "How does a label become programmatically associated with an input?", ["Its for value matches the input id", "It is placed after the form", "The input has a placeholder"], 0,
            "Do not use placeholder text as a replacement for a persistent visible label.",
            "Create a required email field with a visible label and a submit button.", "<form>\n  <!-- label and email input -->\n</form>",
            "Use matching for/id values, type=email, name, required, and a real submit button.", "<form>\n  <label for=\"contact-email\">Email</label>\n  <input id=\"contact-email\" name=\"email\" type=\"email\" required>\n  <button type=\"submit\">Send</button>\n</form>",
            "Matching label for and control id values provide a reliable accessible name regardless of placeholder support."),
        ],
      },
      {
        id: "web-css-layout", title: "CSS styling and layout", sortOrder: 2,
        lessons: [
          lesson("web-css-selectors", "Style elements with CSS", 14, "Beginner", "Use selectors and the cascade to apply consistent visual rules.",
            "A CSS rule contains a selector and declarations. Class selectors are reusable across elements; IDs should remain unique. When multiple rules match, specificity and source order help determine which declaration wins. Keep styles grouped by component or purpose.",
            ".card {\n  color: #20243a;\n  background: white;\n  border-radius: 12px;\n}\n\n.card h2 {\n  margin-top: 0;\n}",
            "Which selector is designed for reusable styling on multiple elements?", ["A class selector such as .card", "An ID selector repeated everywhere", "The !important keyword for every rule"], 0,
            "Prefer a reusable class and avoid escalating specificity when a clear component class will do.",
            "Style a .notice class with readable text, a pale background, and inner spacing.", ".notice {\n  /* add styles */\n}",
            "Set color, background-color, padding, and a border radius.", ".notice {\n  color: #26324a;\n  background-color: #eef4ff;\n  padding: 1rem;\n  border-radius: .5rem;\n}",
            "Class selectors are reusable. Repeated IDs create invalid or confusing document semantics."),
          lesson("web-box-model", "Understand the CSS box model", 13, "Beginner", "Control element size and spacing using content, padding, borders, and margins.",
            "The default content-box sizing adds padding and border outside the declared width. With border-box, the declared width includes content, padding, and border, which makes layout arithmetic more predictable. Margin creates space outside the border; padding creates space inside it.",
            "*, *::before, *::after {\n  box-sizing: border-box;\n}\n\n.panel {\n  width: 320px;\n  padding: 24px;\n  border: 2px solid #ddd;\n  margin: 16px auto;\n}",
            "With box-sizing: border-box, what does a declared width include?", ["Content, padding, and border", "Only the content", "The element's margin"], 0,
            "Apply border-box globally, then use padding for internal space and margin for outside separation.",
            "Make a 280-pixel-wide panel whose width already includes padding and border.", ".panel {\n  width: 280px;\n  padding: 20px;\n  border: 1px solid;\n}",
            "Set box-sizing: border-box on the panel or use the common global rule.", ".panel {\n  box-sizing: border-box;\n  width: 280px;\n  padding: 20px;\n  border: 1px solid;\n}",
            "Border-box counts padding and border inside the declared width; margin remains outside."),
          lesson("web-flexbox-grid", "Lay out content with Flexbox and Grid", 15, "Beginner", "Choose Flexbox for one-dimensional alignment and Grid for two-dimensional layouts.",
            "Flexbox arranges items along a main axis and is useful for navigation bars or aligned controls. Grid defines rows and columns and works well for page sections and card galleries. Both provide powerful alignment without floats or arbitrary positioning.",
            ".toolbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n}\n\n.course-grid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 1rem;\n}",
            "Which layout is designed to manage rows and columns together?", ["CSS Grid", "A text-align rule", "A margin reset"], 0,
            "Start with the layout direction and alignment you need; do not choose a layout tool by habit.",
            "Create a responsive-ready two-column card grid with a one-rem gap.", ".cards {\n  /* define columns and spacing */\n}",
            "Use display:grid, repeat with minmax(0, 1fr), and gap.", ".cards {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 1rem;\n}",
            "Grid models rows and columns; Flexbox primarily arranges items along one main axis."),
        ],
      },
      {
        id: "web-responsive-accessibility", title: "Responsive and accessible design", sortOrder: 3,
        lessons: [
          lesson("web-responsive-design", "Design for every screen size", 15, "Intermediate", "Use flexible sizing and mobile-first breakpoints to adapt content to available space.",
            "Responsive layouts combine fluid widths, flexible grids, and media queries. A mobile-first base style targets small screens, then a min-width query adds columns as space allows. The viewport meta tag helps mobile browsers use the device width.",
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n\n.cards {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 1rem;\n}\n\n@media (min-width: 48rem) {\n  .cards { grid-template-columns: repeat(2, 1fr); }\n}",
            "What is the benefit of a mobile-first base layout?", ["It starts with a usable narrow-screen design and enhances for wider screens", "It disables desktop styles", "It fixes the page to one pixel width"], 0,
            "Test at content-driven breakpoints and avoid designing for only a short list of popular device widths.",
            "Stack cards on small screens and show three columns when the viewport is at least 60rem wide.", ".cards { display: grid; }\n/* add a mobile-first grid and breakpoint */",
            "Use one column by default and a min-width media query to change to three columns.", ".cards { display: grid; grid-template-columns: 1fr; }\n@media (min-width: 60rem) {\n  .cards { grid-template-columns: repeat(3, 1fr); }\n}",
            "Mobile-first means the base experience works on narrow screens before wider layouts are layered on."),
          lesson("web-accessibility", "Make interfaces accessible", 15, "Intermediate", "Improve keyboard access, text contrast, focus visibility, and semantic structure.",
            "Accessible pages expose meaningful names and structure to assistive technology and remain usable without a pointer. Semantic HTML provides built-in behavior. Visible focus styles, sufficient contrast, descriptive labels, and reduced-motion support help a wide range of users.",
            "a:focus-visible,\nbutton:focus-visible {\n  outline: 3px solid #5b45d6;\n  outline-offset: 3px;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { scroll-behavior: auto; }\n}",
            "Why should keyboard focus remain visible?", ["Keyboard users need to know which control will activate", "It improves image resolution", "It replaces page headings"], 0,
            "Tab through the whole page and check that every interactive control has a visible focus indicator.",
            "Add a clear focus-visible outline to buttons and links.", "button:focus-visible,\na:focus-visible {\n  /* add an outline */\n}",
            "Choose a high-contrast outline and offset it so it does not merge into the control border.", "button:focus-visible,\na:focus-visible {\n  outline: 3px solid #5b45d6;\n  outline-offset: 3px;\n}",
            "Visible focus communicates the current keyboard position and is essential for non-pointer navigation."),
          lesson("web-site-capstone", "Capstone: build a responsive learning page", 18, "Intermediate", "Combine semantic structure, styling, responsive layout, and accessibility checks in one small site.",
            "A maintainable page begins with content hierarchy and semantic elements, then gains styling through reusable classes and layout primitives. Verify it at narrow and wide sizes, use the keyboard, inspect headings and labels, and check that the most important content remains understandable without decoration.",
            "<main class=\"page\">\n  <header class=\"page-header\"><h1>Learning journal</h1></header>\n  <section class=\"cards\" aria-label=\"Study topics\">\n    <article class=\"card\"><h2>Practice</h2><p>Try one small task.</p></article>\n  </section>\n</main>",
            "Which review step best checks whether the capstone works for different users?", ["Check only the desktop screenshot", "Test responsive widths, keyboard use, and semantic labels", "Remove all headings"], 1,
            "Use browser dev tools to inspect layout at multiple widths and fix overflow rather than hiding it.",
            "Add a semantic card, style its layout, and write three checks you would perform before publishing.", "<main>\n  <!-- add a labeled section and article -->\n</main>",
            "Use section with an accessible label, article for a self-contained card, then test keyboard and narrow screens.", "<main>\n  <section aria-label=\"Study topics\">\n    <article><h2>Practice</h2><p>Try one small task.</p></article>\n  </section>\n</main>\n\n<!-- Check narrow layout, keyboard focus, and heading order. -->",
            "A responsive and accessibility review checks the actual content and interactions at varied sizes and input methods."),
        ],
      },
    ],
  },
  {
    course: {
      id: "git-github",
      title: "Git & GitHub Essentials",
      description: "Learn the everyday version-control workflow: inspect changes, make meaningful commits, branch safely, resolve conflicts, and collaborate through GitHub pull requests. Practice with real commands and a small team-style workflow.",
      language: "git",
      level: "Beginner",
      estimatedMinutes: 150,
      recommendedPrerequisites: [],
      learningOutcomes: [
        "Explain repositories, working trees, staging, commits, and remotes.",
        "Inspect and record focused changes with a useful commit history.",
        "Create branches, merge work, and resolve a simple conflict.",
        "Use GitHub issues and pull requests to collaborate and request review.",
        "Recover from common mistakes using safe inspection and restore commands."
      ],
    },
    modules: [
      {
        id: "git-core-workflow", title: "Version control basics", sortOrder: 1,
        lessons: [
          lesson("git-why-version-control", "Why version control matters", 12, "Beginner", "Understand how Git records changes and lets you explore project history safely.",
            "Git stores snapshots of project state as commits. A repository contains project files and history. You can compare versions, identify which change introduced a problem, and work on experiments without copying folders named final-final.",
            "git --version\ngit init\ngit status",
            "What does a Git commit represent?", ["A recorded snapshot of staged project changes", "A remote server backup", "A command that permanently publishes a website"], 0,
            "Use git status often: it reports the current branch and whether files are staged or modified.",
            "Initialize a repository and inspect its initial state.", "git init\n# inspect the working tree",
            "Run git status after initialization.", "git init\ngit status",
            "A commit records a project snapshot; it does not automatically upload or deploy it."),
          lesson("git-stage-commit", "Stage and commit changes", 14, "Beginner", "Select changes for a commit and write a message that describes the intent.",
            "Git separates the working tree from the staging area. git add selects changes for the next snapshot, and git commit records that staged set. Review with git diff and git diff --staged before committing. Small, focused commits are easier to review and undo.",
            "git status\ngit diff\ngit add README.md\ngit diff --staged\ngit commit -m \"Document local setup\"",
            "What does git add do?", ["Stages selected changes for the next commit", "Deletes the remote branch", "Publishes a package"], 0,
            "Review staged changes before committing so unrelated edits do not accidentally travel together.",
            "Stage one changed file and commit it with a specific message.", "git status\n# stage the intended file\n# commit with a message",
            "Use git add <file>, then git commit -m with a short verb-led description.", "git add README.md\ngit commit -m \"Clarify setup steps\"",
            "git add stages changes; git commit records the staged snapshot in local repository history."),
          lesson("git-branches", "Work with branches", 14, "Beginner", "Create an isolated branch for a feature and switch between branches deliberately.",
            "A branch is a movable name pointing at a commit, not a full copy of the project. Feature branches let you develop independently from the main line. Commit your work, then merge it back after review.",
            "git switch -c add-course-outline\n# edit and commit the feature\n\ngit switch main\ngit merge add-course-outline",
            "Why create a feature branch?", ["To isolate a change while keeping the main line stable", "To create a second Git installation", "To erase the commit history"], 0,
            "Give branches short names tied to the task, and check git status before switching.",
            "Create and switch to a branch named improve-python-course.", "git switch -c ",
            "Append the task name after -c.", "git switch -c improve-python-course",
            "A branch isolates development by pointing to a separate line of commits."),
        ],
      },
      {
        id: "git-collaboration", title: "Collaboration and recovery", sortOrder: 2,
        lessons: [
          lesson("git-conflicts", "Understand and resolve merge conflicts", 15, "Intermediate", "Resolve conflicting edits by inspecting markers and keeping the intended combined result.",
            "A merge conflict happens when Git cannot automatically combine overlapping changes. Conflict markers show the current branch, separator, and incoming branch versions. Edit the file into the desired final state, remove markers, test it, stage the resolution, and complete the merge.",
            "<<<<<<< HEAD\nCurrent heading\n=======\nIncoming heading\n>>>>>>> feature-branch",
            "After editing a conflicted file, what should you do next?", ["Remove conflict markers, verify the result, stage it, and finish the merge", "Delete the repository", "Run git init again"], 0,
            "Do not choose a side automatically without understanding both edits; preserve the intent of each.",
            "Resolve a conflict by keeping a single combined heading and then stage the file.", "git status\n# edit the file to remove conflict markers\n# stage the resolution",
            "Inspect both versions, edit the intended result, then use git add on the resolved file.", "git add README.md\ngit status",
            "A resolved file must be edited into valid content and staged before the merge can be completed."),
          lesson("git-remotes-github", "Connect a repository to GitHub", 14, "Beginner", "Understand remotes and safely push or fetch branches from a hosted repository.",
            "A remote is a named URL for another copy of a repository. origin is a common name for the default remote. Fetch downloads remote references without merging them; push sends your local commits to a remote when you have permission.",
            "git remote add origin https://github.com/example/study-notes.git\ngit remote -v\ngit push -u origin main\ngit fetch origin",
            "What does git fetch do?", ["Downloads remote references without automatically merging them", "Deletes all local commits", "Creates a GitHub account"], 0,
            "Check the remote URL before pushing, especially if a project has multiple remotes.",
            "Add origin for your GitHub repository and verify the configured URL.", "git remote add origin ",
            "Use the repository's HTTPS or SSH URL, then inspect remotes.", "git remote add origin https://github.com/your-name/study-notes.git\ngit remote -v",
            "fetch updates remote-tracking references; it does not by itself merge changes into the current branch."),
          lesson("git-pull-requests", "Collaborate with issues and pull requests", 14, "Beginner", "Use issues to describe work and pull requests to discuss proposed changes.",
            "An issue captures a bug, question, or task. A pull request (PR) proposes changes from a branch and provides a place for review, discussion, and automated checks. A clear PR explains what changed, why, and how someone can verify it.",
            "git switch -c add-search-help\n# make focused changes\ngit add .\ngit commit -m \"Explain course search\"\ngit push -u origin add-search-help",
            "What is the main purpose of a pull request?", ["Propose changes for review and discussion", "Replace all local branches", "Store a user password"], 0,
            "Keep a PR focused and include screenshots or test instructions when they help reviewers.",
            "Write a concise PR summary with a reason and one verification step.", "## What changed?\n\n## Why?\n\n## How to verify?",
            "Describe the user-visible change, its motivation, and a reproducible check.", "## What changed?\nAdded clear course-search help text.\n\n## Why?\nNew learners need to know how filtering works.\n\n## How to verify?\nOpen the course catalog and search for a topic.",
            "Pull requests are reviewable proposals; issues help coordinate work before or alongside them."),
          lesson("git-safe-recovery", "Inspect and recover from mistakes", 15, "Intermediate", "Use inspection commands and safer restore operations before changing history.",
            "git log and git show help identify recorded changes. git diff shows uncommitted edits. git restore can discard selected working-tree changes, so inspect first; git restore --staged removes a file from staging without deleting its edits. Avoid destructive reset or force-push commands until you understand their impact.",
            "git status\ngit diff\ngit log --oneline -5\ngit restore --staged notes.txt",
            "Which command unstages a file while keeping its working-tree edits?", ["git restore --staged notes.txt", "git clean -fd", "git push --force"], 0,
            "Before recovery, check status and diff so you know exactly which work may be changed.",
            "Inspect recent commits and unstage notes.txt without discarding its edits.", "git log --oneline -5\n# unstage notes.txt safely",
            "Use git restore --staged for the staging area; avoid restore without --staged if you want to keep edits.", "git restore --staged notes.txt\ngit status",
            "git restore --staged removes the staging selection but preserves the working-tree contents."),
        ],
      },
    ],
  },
  {
    course: {
      id: "sql-databases",
      title: "SQL & Database Essentials",
      description: "Learn relational database foundations by reading, filtering, grouping, and joining data. Then explore safe data changes, keys, relationships, and indexes through practical examples that build toward a small learning-platform schema.",
      language: "sql",
      level: "Beginner to Intermediate",
      estimatedMinutes: 180,
      recommendedPrerequisites: [],
      learningOutcomes: [
        "Read rows and selected columns with SELECT, WHERE, ORDER BY, and LIMIT.",
        "Summarize records with aggregate functions and GROUP BY.",
        "Combine related tables with joins and reason about keys.",
        "Write cautious INSERT, UPDATE, and DELETE statements.",
        "Design a small relational schema and explain when an index is useful."
      ],
    },
    modules: [
      {
        id: "sql-querying", title: "Query and filter data", sortOrder: 1,
        lessons: [
          lesson("sql-select", "Read data with SELECT", 13, "Beginner", "Retrieve specific columns from a table and avoid unnecessary data.",
            "SELECT names columns, and FROM names the source table. Use explicit columns instead of SELECT * in application queries so the result shape stays clear as a schema grows. A query reads data; it does not modify stored rows.",
            "SELECT title, level\nFROM lessons;",
            "Which clause identifies the table being read?", ["FROM", "SET", "VALUES"], 0,
            "Select only columns needed by the task to reduce ambiguity and avoid retrieving sensitive fields.",
            "Return each course title and its publication status.", "SELECT \nFROM courses;",
            "Name the two columns after SELECT, then use FROM courses.", "SELECT title, published\nFROM courses;",
            "FROM identifies the table; SELECT lists the output columns."),
          lesson("sql-filter-sort", "Filter and sort results", 14, "Beginner", "Use WHERE, comparisons, and ORDER BY to find records in a predictable order.",
            "WHERE filters rows before they are returned. Combine conditions with AND or OR and use parentheses when grouping matters. ORDER BY sorts the result; specify ASC or DESC when direction should be obvious. NULL values need IS NULL rather than equality comparisons.",
            "SELECT title, duration\nFROM lessons\nWHERE level = 'Beginner' AND duration <= 10\nORDER BY duration ASC, title ASC;",
            "How should a query test whether a column has no value?", ["column = NULL", "column IS NULL", "column == empty"], 1,
            "Use parameterized queries for values supplied by a person; do not concatenate input into SQL text.",
            "Find published courses ordered alphabetically by title.", "SELECT title\nFROM courses\nWHERE \nORDER BY ;",
            "Filter published rows, then order title ascending.", "SELECT title\nFROM courses\nWHERE published = true\nORDER BY title ASC;",
            "SQL NULL uses three-valued logic; IS NULL is the correct null test."),
          lesson("sql-aggregates", "Summarize rows with aggregates", 15, "Beginner", "Use COUNT, SUM, and GROUP BY to calculate summaries for categories of rows.",
            "Aggregate functions summarize multiple rows. GROUP BY forms one result group for each selected grouping value. HAVING filters groups after aggregation, while WHERE filters rows before grouping. Keep non-aggregated selected columns in the GROUP BY list.",
            "SELECT level, COUNT(*) AS lesson_count, AVG(duration) AS avg_minutes\nFROM lessons\nGROUP BY level\nHAVING COUNT(*) >= 2\nORDER BY lesson_count DESC;",
            "Which clause filters groups after aggregate calculations?", ["WHERE", "HAVING", "LIMIT"], 1,
            "Use WHERE for row-level criteria and HAVING for criteria involving aggregate results.",
            "Count learners by role and show the largest groups first.", "SELECT role, COUNT(*) AS learner_count\nFROM profiles\nGROUP BY role\nORDER BY ;",
            "Sort by the aggregate alias in descending order.", "SELECT role, COUNT(*) AS learner_count\nFROM profiles\nGROUP BY role\nORDER BY learner_count DESC;",
            "HAVING evaluates group-level conditions after GROUP BY."),
          lesson("sql-joins", "Combine related tables with joins", 15, "Beginner", "Use primary and foreign key relationships to retrieve related information.",
            "A JOIN combines rows using a relationship condition. INNER JOIN returns matching rows; LEFT JOIN keeps every row from the left side and fills missing right-side values with NULL. Qualify column names when both tables contain the same name.",
            "SELECT courses.title, modules.title AS module_title\nFROM courses\nJOIN modules ON modules.course_id = courses.id\nORDER BY courses.title, modules.sort_order;",
            "What does a LEFT JOIN preserve?", ["Every row from its left input", "Only rows with no relationship", "Only the first row"], 0,
            "Write the join condition explicitly and use aliases when joining a table more than once.",
            "List each lesson with its module title using the lesson's module_id.", "SELECT lessons.title, modules.title\nFROM lessons\nJOIN modules ON ;",
            "Match the module foreign key to the module primary key.", "SELECT lessons.title, modules.title AS module_title\nFROM lessons\nJOIN modules ON lessons.module_id = modules.id;",
            "The ON clause expresses how related rows match; LEFT JOIN preserves the left-hand rows."),
        ],
      },
      {
        id: "sql-data-and-design", title: "Modify data and design tables", sortOrder: 2,
        lessons: [
          lesson("sql-safe-mutations", "Change data safely", 15, "Intermediate", "Use INSERT, UPDATE, and DELETE carefully, with a preview of the exact rows affected.",
            "INSERT creates rows, UPDATE changes matching rows, and DELETE removes matching rows. Before a destructive mutation, run a SELECT with the same WHERE condition and verify its result. In production, use transactions and parameterized statements.",
            "BEGIN;\nUPDATE lessons\nSET duration = 12\nWHERE id = 'first-steps';\n-- verify the change, then COMMIT or ROLLBACK",
            "What should you do before an UPDATE that affects learner records?", ["Preview the same WHERE condition with SELECT", "Remove the WHERE clause", "Disable all constraints"], 0,
            "A missing WHERE clause may change every row; review the target set before applying mutations.",
            "Update one lesson duration only after previewing the matching ID.", "SELECT id, duration FROM lessons WHERE id = 'first-steps';\n-- then write a scoped UPDATE",
            "Use the same unique lesson ID in the UPDATE's WHERE clause.", "UPDATE lessons\nSET duration = 12\nWHERE id = 'first-steps';",
            "Previewing the filter and scoping the mutation reduce accidental broad data changes."),
          lesson("sql-keys-relationships", "Use primary and foreign keys", 14, "Beginner", "Model unique row identity and enforce references between related tables.",
            "A primary key uniquely identifies a row. A foreign key references a key in another table and prevents dangling relationships. Choose ON DELETE behavior deliberately because cascades can remove dependent records; RESTRICT or SET NULL may be safer for historical data.",
            "CREATE TABLE modules (\n  id text PRIMARY KEY,\n  course_id text NOT NULL REFERENCES courses(id),\n  title text NOT NULL,\n  UNIQUE (course_id, title)\n);",
            "What does a foreign key enforce?", ["That a reference points to a valid related row", "That a query always runs faster", "That every column is encrypted"], 0,
            "Use stable identifiers and define delete behavior based on whether related history must be retained.",
            "Define a lesson table with a primary key and a required module reference.", "CREATE TABLE lessons (\n  id text PRIMARY KEY,\n  module_id text NOT NULL\n);",
            "Add a REFERENCES clause from module_id to modules(id).", "CREATE TABLE lessons (\n  id text PRIMARY KEY,\n  module_id text NOT NULL REFERENCES modules(id)\n);",
            "A foreign key enforces referential integrity; it does not promise query performance."),
          lesson("sql-schema-design", "Design a small relational schema", 15, "Intermediate", "Separate related entities and connect them through stable keys.",
            "A relational schema represents distinct concepts in tables and connects them with keys. Repeating a course title on every lesson creates update anomalies. Store a course once, store lessons separately, and link each lesson to its module. Add constraints to encode essential rules.",
            "CREATE TABLE courses (\n  id text PRIMARY KEY,\n  title text NOT NULL\n);\nCREATE TABLE modules (\n  id text PRIMARY KEY,\n  course_id text NOT NULL REFERENCES courses(id),\n  title text NOT NULL\n);",
            "Why keep course data separate from every lesson row?", ["To reduce duplicated facts and update anomalies", "To avoid using identifiers", "To prevent selecting columns"], 0,
            "Model each real-world entity once and choose constraints that reflect its valid relationships.",
            "Sketch courses, modules, and lessons so a course can contain many modules and each module contains many lessons.", "-- define each entity and its foreign key",
            "Give each table a primary key, then reference the parent key from each child table.", "courses(id PRIMARY KEY)\nmodules(id PRIMARY KEY, course_id REFERENCES courses(id))\nlessons(id PRIMARY KEY, module_id REFERENCES modules(id))",
            "Separate tables reduce duplicate data and foreign keys represent the one-to-many relationships."),
          lesson("sql-indexes-capstone", "Indexes and capstone: course reporting", 16, "Intermediate", "Read a simple query plan and choose an index based on a real filter or join.",
            "An index can help the database locate rows efficiently for common filters, sorts, or joins, but it uses storage and adds write work. Index the columns that support measured query patterns, not every field. A capstone report might join courses and modules, count lessons, and group results by course.",
            "CREATE INDEX lessons_module_id_idx ON lessons(module_id);\n\nSELECT courses.title, COUNT(lessons.id) AS lesson_count\nFROM courses\nLEFT JOIN modules ON modules.course_id = courses.id\nLEFT JOIN lessons ON lessons.module_id = modules.id\nGROUP BY courses.id, courses.title;",
            "Why should indexes be chosen from measured query patterns?", ["Each index has storage and write-maintenance costs", "Indexes make invalid SQL valid", "Every column must have exactly one index"], 0,
            "Inspect representative query plans and write volume before adding or removing an index.",
            "Report each course and its number of lessons, including courses with none.", "SELECT courses.title, COUNT(lessons.id) AS lesson_count\nFROM courses\nLEFT JOIN modules ON modules.course_id = courses.id\nLEFT JOIN lessons ON lessons.module_id = modules.id\nGROUP BY ;",
            "Group by the course's stable key and title, and use LEFT JOIN to keep empty courses.", "SELECT courses.id, courses.title, COUNT(lessons.id) AS lesson_count\nFROM courses\nLEFT JOIN modules ON modules.course_id = courses.id\nLEFT JOIN lessons ON lessons.module_id = modules.id\nGROUP BY courses.id, courses.title\nORDER BY courses.title;",
            "Indexes are workload trade-offs; LEFT JOIN preserves courses with no matching lessons."),
        ],
      },
    ],
  },
];

export const additionalCourses: CourseDefinition[] = curriculumDrafts.map(({ course }) => course);

export const additionalModules: CourseModule[] = curriculumDrafts.flatMap(({ course, modules }) =>
  modules.map((curriculumModule) => ({
    id: curriculumModule.id,
    title: curriculumModule.title,
    courseId: course.id,
    sortOrder: curriculumModule.sortOrder,
  })),
);

export const additionalLessons: CurriculumLesson[] = curriculumDrafts.flatMap(({ course, modules }) =>
  modules.flatMap((curriculumModule) => curriculumModule.lessons.map((curriculumLesson) => ({
    ...curriculumLesson,
    category: curriculumModule.title,
    icon: course.id === "python-programming" ? "Py" : course.id === "web-development" ? "</>" : course.id === "git-github" ? "Git" : "SQL",
  }))),
);
