var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/tools.ts
var fs = __toESM(require("fs"));
function assignedAddresses() {
  let input = fs.readFileSync(process.stdin.fd, "latin1");
  let assigned = false;
  for (let network of JSON.parse(input)) {
    assigned = assigned || network.assignedAddresses.length > 0;
  }
  process.exitCode = assigned ? 0 : 1;
}
function showIp() {
  let input = fs.readFileSync(process.stdin.fd, "latin1");
  let ip = "";
  for (let network of JSON.parse(input)) {
    for (let mask of network.assignedAddresses) {
      ip = mask.trim();
      let pos = ip.indexOf("/");
      if (pos > 0) {
        ip = ip.substring(0, pos).trim();
        ;
      }
    }
  }
  if (ip !== "") {
    console.log(ip);
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
}
process.exitCode = 99;
switch (process.argv[2]) {
  case "assigned":
    assignedAddresses();
    break;
  case "ip":
    showIp();
    break;
}
//# sourceMappingURL=tools.js.map
