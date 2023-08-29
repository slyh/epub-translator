import domSerializer from "dom-serializer";
import * as domutils from "domutils";
import * as htmlparser2 from "htmlparser2";

import config from "./config";

type Document = ReturnType<typeof htmlparser2.parseDocument>;
type Element = ReturnType<typeof domutils.getElementsByTagName>[0];

// Elements that are starting a new paragraph
const blockElements = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];

// Elements that will not be sent for translation.
const bypassElements = ["audio", "canvas", "code", "iframe", "img", "picture", "svg", "video"];

const newlineElements = ["br"];

// Elements that will be sent for translation without preprocessing or postprocessing.
const passthroughElements = ["nav", "table"];

// Elements that are allowed in texts.
// Should not be an element that is likely to encapsulate non-styling HTML elements.
const allowElements = () => {
  const elements = ["a", "b", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "s", "strike", "strong", "sub", "sup", "u", "var"];
  if (!config.REMOVE_RUBY_ANNOTATION) {
    elements.push("ruby", "rt");
  }
  return elements;
};

// Elements that will be removed entirely, including their children.
const removeElements = () => {
  const elements = ["script", "style"];
  if (config.REMOVE_RUBY_ANNOTATION) {
    elements.push("rt");
  }
  return elements;
};

const renderer: Record<string, (inputNode: Element, prefix?: string) => string> = {
  ol: listRenderer,
  ul: listRenderer,
};

// Constants
const contentTypes = {
  text: "TEXT",
  html: "HTML",
  sentence: "SENTENCE",
  sentenceHtml: "SENTENCE_HTML",
  bypass: "BYPASS",
  passthrough: "PASSTHROUGH"
};

// Split HTML into chunks
function split(htmlString: string) {
  const dom = htmlparser2.parseDocument(htmlString);

  let body: Document | Element = dom;
  const bodys = domutils.getElementsByTagName("body", dom, true, 1);
  if (bodys.length > 0) {
    body = bodys[0];
  }

  let title = "Title";
  const titles = domutils.getElementsByTagName("title", dom, true, 1);
  if (titles.length > 0) {
    title = domSerializer(domutils.getChildren(titles[0]), { emptyAttrs: true, encodeEntities: "utf8", selfClosingTags: true });
  }

  const children = domutils.getChildren(body);

  const defaultBuffer = {
    type: contentTypes.text,
    data: ""
  };
  let buffer = structuredClone(defaultBuffer);

  const result = [{
    type: contentTypes.sentence,
    data: title
  }];

  const push = () => {
    buffer.data = buffer.data.trim();
    if (buffer.data.length > 0) {
      result.push(buffer);
    }
    buffer = structuredClone(defaultBuffer);
  };

  while (children.length > 0) {
    const node = children.shift();

    if (node && node.type == htmlparser2.ElementType.ElementType.Text) {
      buffer.data += textCleanUp(node.data);
    }

    if (node && node.type == htmlparser2.ElementType.ElementType.Tag) {
      if (blockElements.includes(node.name)) {
        push();
      }

      if (newlineElements.includes(node.name)) {
        buffer.data += "\n";
      }

      if (removeElements().includes(node.name)) {
        continue;
      }

      if (node.name in renderer) {
        push();

        buffer.type = contentTypes.html;
        buffer.data = renderer[node.name](node);
        push();
      } else if (passthroughElements.includes(node.name)) {
        push();

        buffer.type = contentTypes.passthrough;
        buffer.data = domSerializer(node, { emptyAttrs: true, encodeEntities: "utf8", selfClosingTags: true });
        push();
      } else if (allowElements().includes(node.name)) {
        buffer.type = contentTypes.html;
        buffer.data += domSerializer(elementCleanUp(node), { emptyAttrs: true, encodeEntities: "utf8", selfClosingTags: true });
      } else if (bypassElements.includes(node.name)) {
        push();

        buffer.type = contentTypes.bypass;
        buffer.data = domSerializer(node, { emptyAttrs: true, encodeEntities: "utf8", selfClosingTags: true });
        push();
      } else {
        // Only iterate the children if the node is not serialised or rendered
        children.unshift(...domutils.getChildren(node));
      }
    }
  }

  push();

  return result;
}

// Reversed ordered lists are not supported
function listRenderer(inputNode: Element, prefix = ""): string {
  if (!["ol", "ul"].includes(inputNode.name)) {
    throw new Error("Unsupported element in list renderer.");
  }

  const children = Array.from(domutils.getChildren(inputNode));
  const isOrderedList = inputNode.name == "ol";

  let result = "";

  let count = 1;
  if (isOrderedList) {
    count = parseInt(domutils.getAttributeValue(inputNode, "start") ?? "1");
  }

  while (children.length > 0) {
    const node = children.shift();

    if (node && node.type == htmlparser2.ElementType.ElementType.Text) {
      result += textCleanUp(node.data);
    }

    if (node && node.type == htmlparser2.ElementType.ElementType.Tag) {
      if (removeElements().includes(node.name)) {
        domutils.removeElement(node);
        continue;
      }

      if (blockElements.includes(node.name)) {
        result += "\n\n";
      }

      if (newlineElements.includes(node.name)) {
        result += "\n";
      }

      if (node.name == "li") {
        result += `\n${prefix}` + (isOrderedList ? `${count}. ` : `- `);
        count++;
      }

      if (allowElements().includes(node.name)) {
        result += domSerializer(elementCleanUp(node), { emptyAttrs: true, encodeEntities: "utf8", selfClosingTags: true });
        continue;
      }

      if (["ol", "ul"].includes(node.name)) {
        result += listRenderer(node, prefix + "&#160;&#160;&#160;&#160;");
        continue;
      }

      children.unshift(...domutils.getChildren(node));
    }
  }

  return result;
}

function elementCleanUp(inputNode: Element): Element {
  const resultNode = structuredClone(inputNode);

  const children = Array.from(domutils.getChildren(resultNode));

  while (children.length > 0) {
    const node = children.shift();

    if (node && node.type == htmlparser2.ElementType.ElementType.Text) {
      node.data = textCleanUp(node.data);
    }

    if (node && node.type == htmlparser2.ElementType.ElementType.Tag) {
      if (removeElements().includes(node.name)) {
        domutils.removeElement(node);
        continue;
      }

      const nodeChildren = domutils.getChildren(node);
      children.unshift(...nodeChildren);

      // Remove elements that are not on the list
      if (
        !blockElements.includes(node.name) &&
        !newlineElements.includes(node.name) &&
        !allowElements().includes(node.name)
      ) {
        for (const c of nodeChildren) {
          domutils.append(node, c);
        }
        domutils.removeElement(node);
      }
    }
  }

  return resultNode;
}

function textCleanUp(input: string) {
  return input.trim().replaceAll(/[\r\n]+/gm, "").replaceAll(/ +/gm, " ");
}

export default {
  contentTypes,
  split
};