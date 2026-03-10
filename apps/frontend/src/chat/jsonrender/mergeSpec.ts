import type { JsonRenderElement, JsonRenderSpec } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (!deepEqual(left[index], right[index])) {
        return false;
      }
    }

    return true;
  }

  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    for (const key of leftKeys) {
      if (!(key in right)) {
        return false;
      }

      if (!deepEqual(left[key], right[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function isEmptyProps(props: JsonRenderElement["props"]): boolean {
  return !props || Object.keys(props).length === 0;
}

function childrenEqual(
  leftChildren: JsonRenderElement["children"],
  rightChildren: JsonRenderElement["children"],
): boolean {
  const left = leftChildren ?? [];
  const right = rightChildren ?? [];

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function propsEqual(
  leftProps: JsonRenderElement["props"],
  rightProps: JsonRenderElement["props"],
): boolean {
  if (isEmptyProps(leftProps) && isEmptyProps(rightProps)) {
    return true;
  }

  return deepEqual(leftProps, rightProps);
}

function elementsEqual(left: JsonRenderElement, right: JsonRenderElement): boolean {
  if (left.type !== right.type) return false;
  if (!childrenEqual(left.children, right.children)) return false;
  if (!propsEqual(left.props, right.props)) return false;
  const { type: _lt, props: _lp, children: _lc, ...leftExtra } = left;
  const { type: _rt, props: _rp, children: _rc, ...rightExtra } = right;
  return deepEqual(leftExtra, rightExtra);
}

function cloneElementReference(element: JsonRenderElement): JsonRenderElement {
  return { ...element };
}

function buildParentsByChild(
  elements: Record<string, JsonRenderElement>,
): Record<string, string[]> {
  const parentsByChild: Record<string, string[]> = {};

  for (const [parentId, element] of Object.entries(elements)) {
    for (const childId of element.children ?? []) {
      const parents = parentsByChild[childId];

      if (parents) {
        parents.push(parentId);
      } else {
        parentsByChild[childId] = [parentId];
      }
    }
  }

  return parentsByChild;
}

export function mergeJsonRenderSpec(
  previous: JsonRenderSpec | null,
  next: JsonRenderSpec,
): JsonRenderSpec {
  if (!previous) {
    return next;
  }

  if (previous.root !== next.root) {
    return next;
  }

  const mergedElements: Record<string, JsonRenderElement> = {};
  const directlyChangedIds = new Set<string>();

  for (const [elementId, nextElement] of Object.entries(next.elements)) {
    const previousElement = previous.elements[elementId];

    if (previousElement && elementsEqual(previousElement, nextElement)) {
      mergedElements[elementId] = previousElement;
      continue;
    }

    mergedElements[elementId] = nextElement;
    directlyChangedIds.add(elementId);
  }

  let hasRemovedElements = false;
  for (const previousId of Object.keys(previous.elements)) {
    if (!(previousId in next.elements)) {
      hasRemovedElements = true;
      break;
    }
  }

  if (directlyChangedIds.size === 0 && !hasRemovedElements) {
    return previous;
  }

  if (directlyChangedIds.size === 0) {
    return {
      root: next.root,
      elements: mergedElements,
    };
  }

  const parentsByChild = buildParentsByChild(mergedElements);
  const changedSubtreeIds = new Set<string>(directlyChangedIds);
  const queue = [...directlyChangedIds];

  while (queue.length > 0) {
    const changedId = queue.pop();
    if (!changedId) {
      continue;
    }

    const parentIds = parentsByChild[changedId];
    if (!parentIds) {
      continue;
    }

    for (const parentId of parentIds) {
      if (changedSubtreeIds.has(parentId)) {
        continue;
      }

      changedSubtreeIds.add(parentId);
      queue.push(parentId);
    }
  }

  for (const elementId of changedSubtreeIds) {
    if (directlyChangedIds.has(elementId)) {
      continue;
    }

    const element = mergedElements[elementId];
    if (!element) {
      continue;
    }

    mergedElements[elementId] = cloneElementReference(element);
  }

  return {
    root: next.root,
    elements: mergedElements,
  };
}
