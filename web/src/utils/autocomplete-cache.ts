
class AutoCompleteCache {
  private namespaces: string[] = [];
  private kinds: string[] = [];
  private names: Map<string, string[]> = new Map();

  getNamespaces() {
    return this.namespaces;
  }

  setNamespaces(ns: string[]) {
    this.namespaces = ns;
  }

  getKinds() {
    return this.kinds;
  }

  setKinds(ks: string[]) {
    this.kinds = ks;
  }

  getNames(kind: string, namespace: string) {
    return this.names.get(`${kind}.${namespace}`);
  }

  setNames(kind: string, namespace: string, names: string[]) {
    this.names.set(`${kind}.${namespace}`, names);
  }

  // hasNamespaces(ns: string) {
  //   this.namespaces = ns;
  // };

  hasNames(kind: string, namespace: string) {
    return this.names.has(`${kind}.${namespace}`);
  }

  clear() {
    this.namespaces = [];
    this.kinds = [];
    this.names.clear();
  }
}

export const autoCompleteCache = new AutoCompleteCache();
