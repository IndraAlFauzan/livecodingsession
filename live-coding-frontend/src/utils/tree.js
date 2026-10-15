export function removePathFromTree(nodes, targetPath) {
  return nodes
    .filter((node) => node.path !== targetPath)
    .map((node) => {
      if (node.type !== "folder") return node;

      return {
        ...node,
        children: removePathFromTree(node.children || [], targetPath),
      };
    });
}

export function sortTree(nodes) {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  }).map((node) => {
    if (node.type !== "folder") return node;
    return { ...node, children: sortTree(node.children || []) };
  });
}
