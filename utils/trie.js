// utils/trie.js
class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
    this.meta = []; // holds matching leads
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(text, leadData) {
    let node = this.root;
    for (const char of text.toLowerCase()) {
      if (!node.children[char]) node.children[char] = new TrieNode();
      node = node.children[char];
    }
    node.isEnd = true;
    node.meta.push(leadData);
  }

  search(prefix) {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children[char]) return [];
      node = node.children[char];
    }
    return this._collectAll(node);
  }

  _collectAll(node) {
    let results = [];
    if (node.isEnd) results.push(...node.meta);
    for (const key in node.children) {
      results = results.concat(this._collectAll(node.children[key]));
    }
    return results;
  }
}

module.exports = Trie;
