const text = '{ "files": { "/App.js": { "code": "<div className=\\"foo\\"> \\" }" } } }';
const fixed = text.replace(/"code"\s*:\s*"([\s\S]*?)"(?=\s*\}\s*(?:,|\}|$))/g, (m, c) => '"code": "' + c.replace(/(?<!\\)"/g, '\\"') + '"');
console.log(fixed);
