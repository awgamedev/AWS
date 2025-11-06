const genThItem = (label) => {
  return `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${label}</th>`;
};

const genThItems = (labels) => {
  return labels.map((label) => genThItem(label)).join("\n");
};

module.exports = {
  genThItem,
  genThItems,
};
