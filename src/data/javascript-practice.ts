type PracticeExtension = {
  prompt: string;
  hint: string;
  solution: string;
};

const practiceExtensions: Record<string, PracticeExtension> = {
  variables: {
    prompt: "Create a named variable for a favorite color, then print a sentence that uses it.",
    hint: "Use a const binding for a value that will not be reassigned, and a template literal for the sentence.",
    solution: "const favoriteColor = \"blue\";\nconsole.log(`My favorite color is ${favoriteColor}.`);",
  },
  types: {
    prompt: "Create one string, one number, and one boolean, then inspect each value with typeof.",
    hint: "typeof returns a string describing the value's JavaScript type.",
    solution: "const learner = \"Ari\";\nconst lessonCount = 4;\nconst isReady = true;\nconsole.log(typeof learner, typeof lessonCount, typeof isReady);",
  },
  operators: {
    prompt: "Calculate the total price for three items costing 4 each, then print it.",
    hint: "Multiply the unit price by the quantity before logging the result.",
    solution: "const total = 4 * 3;\nconsole.log(total);",
  },
  "truthy-falsy": {
    prompt: "Use Boolean() to compare an empty string with a non-empty string.",
    hint: "An empty string is falsy; any non-empty string is truthy.",
    solution: "console.log(Boolean(\"\"));\nconsole.log(Boolean(\"learn\"));",
  },
  strings: {
    prompt: "Use a template literal to greet someone using a name variable.",
    hint: "Place the variable inside ${...} within backticks.",
    solution: "const name = \"Sam\";\nconsole.log(`Hello, ${name}!`);",
  },
  conditionals: {
    prompt: "Set a score and print whether it passes a threshold of 60.",
    hint: "Use if/else and a comparison operator.",
    solution: "const score = 72;\nif (score >= 60) {\n  console.log(\"Pass\");\n} else {\n  console.log(\"Try again\");\n}",
  },
  loops: {
    prompt: "Print the numbers from 1 to 5 with a for loop.",
    hint: "Start at 1 and keep looping while the counter is less than or equal to 5.",
    solution: "for (let number = 1; number <= 5; number += 1) {\n  console.log(number);\n}",
  },
  arrays: {
    prompt: "Create a list of three study topics and print the second topic.",
    hint: "Array indexes start at zero, so the second item is at index 1.",
    solution: "const topics = [\"values\", \"loops\", \"functions\"];\nconsole.log(topics[1]);",
  },
  objects: {
    prompt: "Create a learner object and print one of its properties.",
    hint: "Use a property name as the key and dot notation to read it.",
    solution: "const learner = { name: \"Mina\", completed: 3 };\nconsole.log(learner.name);",
  },
  "map-set": {
    prompt: "Use a Set to keep only unique names from a list.",
    hint: "Pass the list to new Set(), then spread the set back into an array.",
    solution: "const names = [\"Kai\", \"Mina\", \"Kai\"];\nconst uniqueNames = [...new Set(names)];\nconsole.log(uniqueNames);",
  },
  json: {
    prompt: "Convert a small JavaScript object to JSON text and parse it back.",
    hint: "Use JSON.stringify() to encode and JSON.parse() to decode.",
    solution: "const course = { title: \"JavaScript\", lessons: 8 };\nconst text = JSON.stringify(course);\nconsole.log(JSON.parse(text));",
  },
  functions: {
    prompt: "Write a function that accepts a name and returns a greeting.",
    hint: "Return the formatted value instead of logging inside the function.",
    solution: "function greet(name) {\n  return `Hello, ${name}!`;\n}\nconsole.log(greet(\"Ari\"));",
  },
  "arrow-functions": {
    prompt: "Write an arrow function that doubles a number and call it.",
    hint: "A single-expression arrow function can return its expression implicitly.",
    solution: "const double = (number) => number * 2;\nconsole.log(double(6));",
  },
  scope: {
    prompt: "Create a function with a local variable and return its value.",
    hint: "Declare the variable inside the function so it is local to that function.",
    solution: "function makeMessage() {\n  const message = \"Keep practicing\";\n  return message;\n}\nconsole.log(makeMessage());",
  },
  "array-methods": {
    prompt: "Use map() to turn an array of prices into prices with tax added.",
    hint: "map() returns a new array; calculate each result in its callback.",
    solution: "const prices = [10, 20, 30];\nconst withTax = prices.map((price) => price * 1.1);\nconsole.log(withTax);",
  },
  errors: {
    prompt: "Throw an Error when a required name is empty, then handle it with try/catch.",
    hint: "Use throw new Error(...) and catch the error to show a helpful message.",
    solution: "try {\n  const name = \"\";\n  if (!name) throw new Error(\"Name is required\");\n} catch (error) {\n  console.log(error.message);\n}",
  },
  dom: {
    prompt: "Select an element by its ID and update its text content.",
    hint: "Use document.querySelector() with a #id selector, then assign textContent.",
    solution: "const heading = document.querySelector(\"#page-title\");\nif (heading) heading.textContent = \"Welcome\";",
  },
  events: {
    prompt: "Listen for a button click and update a message on the page.",
    hint: "Find both elements, then attach a click listener with addEventListener().",
    solution: "const button = document.querySelector(\"#show-message\");\nconst message = document.querySelector(\"#message\");\nbutton?.addEventListener(\"click\", () => {\n  if (message) message.textContent = \"Thanks for clicking!\";\n});",
  },
  "dom-build": {
    prompt: "Create a list item safely and add it to an existing list.",
    hint: "Create an element with createElement(), set textContent, then append it.",
    solution: "const item = document.createElement(\"li\");\nitem.textContent = \"Practice DOM updates\";\ndocument.querySelector(\"#topics\")?.append(item);",
  },
  modules: {
    prompt: "Export a named helper from one module and import it into another.",
    hint: "Use export before the function declaration and a matching named import.",
    solution: "// greetings.js\nexport function greet(name) {\n  return `Hello, ${name}!`;\n}\n\n// app.js\nimport { greet } from \"./greetings.js\";\nconsole.log(greet(\"Mina\"));",
  },
  destructuring: {
    prompt: "Destructure a name and role from an object, then print both.",
    hint: "Use matching property names inside braces on the left side of the assignment.",
    solution: "const learner = { name: \"Kai\", role: \"student\" };\nconst { name, role } = learner;\nconsole.log(name, role);",
  },
  promises: {
    prompt: "Create a resolved promise and handle its value with then().",
    hint: "Promise.resolve(value) creates an already-fulfilled promise.",
    solution: "Promise.resolve(\"Ready\")\n  .then((message) => console.log(message));",
  },
  "async-await": {
    prompt: "Write an async function that awaits a resolved promise.",
    hint: "An async function can use await and returns a promise.",
    solution: "async function loadMessage() {\n  const message = await Promise.resolve(\"Loaded\");\n  return message;\n}\nloadMessage().then(console.log);",
  },
  "event-loop": {
    prompt: "Compare a synchronous log with a zero-delay timer callback.",
    hint: "The timer callback runs after the current synchronous code finishes.",
    solution: "console.log(\"first\");\nsetTimeout(() => console.log(\"third\"), 0);\nconsole.log(\"second\");",
  },
  fetch: {
    prompt: "Fetch JSON from an endpoint and handle a failed HTTP response.",
    hint: "Check response.ok before parsing the response body.",
    solution: "async function loadData() {\n  const response = await fetch(\"/api/data\");\n  if (!response.ok) throw new Error(\"Request failed\");\n  return response.json();\n}",
  },
  classes: {
    prompt: "Create a class with a constructor and a method that returns a greeting.",
    hint: "Use this.name to store constructor data on the instance.",
    solution: "class Learner {\n  constructor(name) { this.name = name; }\n  greet() { return `Hello, ${this.name}!`; }\n}\nconsole.log(new Learner(\"Ari\").greet());",
  },
  this: {
    prompt: "Create an object method that reads a property through this.",
    hint: "Call the method on the object so this refers to that object.",
    solution: "const learner = {\n  name: \"Mina\",\n  introduce() { return `I am ${this.name}.`; },\n};\nconsole.log(learner.introduce());",
  },
  storage: {
    prompt: "Save a small preference in localStorage and read it back.",
    hint: "localStorage stores strings, so convert structured values with JSON.",
    solution: "localStorage.setItem(\"theme\", \"dark\");\nconst theme = localStorage.getItem(\"theme\");\nconsole.log(theme);",
  },
  tooling: {
    prompt: "Write a package script that runs a project's test command.",
    hint: "Scripts live under the scripts property in package.json.",
    solution: "{\n  \"scripts\": {\n    \"test\": \"vitest run\"\n  }\n}",
  },
};

export function expandJavascriptLessons<L extends {
  id: string;
  description: string;
  explanation: string;
  options: string[];
  answer: number;
  practicePrompt?: string;
  practiceStarter?: string;
  practiceHint?: string;
  practiceSolution?: string;
  quizExplanation?: string;
}>(lessons: L[]): L[] {
  return lessons.map((lesson) => {
    const practice = practiceExtensions[lesson.id];
    if (!practice) return lesson;
    return {
      ...lesson,
      practicePrompt: lesson.practicePrompt || practice.prompt,
      practiceStarter: lesson.practiceStarter || "// Complete the task described above.",
      practiceHint: lesson.practiceHint || practice.hint,
      practiceSolution: lesson.practiceSolution || practice.solution,
      quizExplanation: lesson.quizExplanation
        || `The correct answer is ${lesson.options[lesson.answer]}. ${lesson.explanation}`,
    };
  });
}
