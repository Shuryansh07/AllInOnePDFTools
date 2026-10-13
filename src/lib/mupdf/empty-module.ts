// Stand-in for Node-only modules (node:module, node:fs) that MuPDF imports behind runtime
// environment checks. They are never executed in a browser; this only lets the bundler resolve them.
export {};
