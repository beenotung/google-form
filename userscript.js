extractForm();

function extractForm() {
  let sections = findSections();
  let title = document.title.replace("- Google Forms", "").trim();
  let description = document
    .querySelector('[aria-label="Form description"]')
    ?.innerText.trim();
  let url = window.location.href;
  let data = {
    title,
    description,
    url,
    sections,
  };
  console.log(JSON.stringify(toData(data), null, 2));
  return data;
}

function toData(object) {
  let result = Array.isArray(object) ? [] : {};
  for (let key in object) {
    let value = object[key];
    if (value?.parentNode) {
      continue;
    }
    if (value && typeof value === "object") {
      value = toData(value);
    }
    if (!value) {
      continue;
    }
    result[key] = value;
  }
  if (Object.keys(result).length === 0) {
    return null;
  }
  return result;
}

function findSections() {
  let sections = findGroup((container) =>
    findByRegex(/^Section \d+ of \d+$/, container),
  );
  for (let section of sections) {
    let counter = section.matchedNode.innerText;
    let title = section.container.querySelector(
      '[aria-label="Section title (optional)"]',
    )?.innerText;
    let description = findSectionDescription(section);
    let questions = findQuestions(section.container);
    Object.assign(section, { counter, title, description, questions });
  }
  return sections;
}

function findSectionDescription(section) {
  let { container, result } = findInParent(
    (container) =>
      container
        .querySelector('[aria-label="Description (optional)"]')
        ?.innerText.trim(),
    section.container,
  );
  section.container = container;
  return result;
}

function findQuestions(sectionContainer) {
  let questions = findGroup(
    (container) => container.querySelectorAll('[aria-label="Question"]'),
    sectionContainer,
  );
  for (let question of questions) {
    let title = question.matchedNode.innerText;
    let type = findQuestionType(question);
    let description = findDescription(question.container);
    let options = findOptions(question.container);
    Object.assign(question, { title, description, type, options });
  }
  return questions;
}

function findQuestionType(question) {
  let { container, result } = findInParent(
    (container) =>
      container
        .querySelector('[aria-label="Question types"] [aria-selected="true"]')
        ?.innerText.trim(),
    question.container,
  );
  question.container = container;
  return result;
}

function findInParent(fn, container) {
  for (;;) {
    let result = fn(container);
    if (result) {
      return { container, result };
    }
    container = container.parentNode;
    if (!container) {
      return;
    }
  }
}

function findDescription(container) {
  let [group] = findGroup(
    (container) =>
      Array.from(container.querySelectorAll('[aria-hidden="true"]')).filter(
        (node) => node.innerText == "Description",
      ),
    container,
  );
  let node = group?.matchedNode.parentNode;
  let text = node?.innerText
    .trim()
    .replace(/^Description/, "")
    .trim();
  return text;
}

function findOptions(questionContainer) {
  let groups = findGroup(
    (container) => container.querySelectorAll("input"),
    questionContainer,
  );
  let options = [];
  for (let group of groups) {
    let input = group.matchedNode;
    let value = input.value;
    if (value) {
      options.push(value);
    }
  }
  return options;
}

function findGroup(fn, container = document.body) {
  let nodeList = fn(container);
  let groupCount = nodeList.length;
  let groups = [];
  for (let node of nodeList) {
    let matchedNode = node;
    let container = node;
    for (;;) {
      let parent = container.parentNode;
      if (!parent) break;
      let nodeList = fn(parent);
      if (nodeList.length == groupCount || parent == container) {
        let group = { matchedNode, container };
        groups.push(group);
        break;
      }
      container = parent;
    }
  }
  return groups;
}

function findByRegex(regex, container) {
  return findByFn((node) => regex.test(node.innerText), container);
}

function findByText(text, container) {
  return findByFn((node) => node.innerText?.includes(text), container);
}

function findByFn(fn, container = document.body) {
  let nodeList = [];
  for (let node of container.querySelectorAll("*")) {
    if (fn(node)) {
      nodeList.push(node);
    }
  }
  nodeList = deduplicate(nodeList);
  return nodeList;
}

function deduplicate(nodeList) {
  for (let i = 0; i < nodeList.length; i++) {
    for (let j = i + 1; j < nodeList.length; j++) {
      if (isInside(nodeList[i], nodeList[j])) {
        nodeList.splice(i, 1);
        i--;
        break;
      }
    }
  }
  return nodeList;
}

function isInside(parent, child) {
  for (; child; child = child.parentNode) {
    if (child == parent) {
      return true;
    }
  }
  return false;
}
