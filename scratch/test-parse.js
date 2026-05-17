const fs = require('fs');
const jsonText = `{ "projectTitle": "Vite React Counter App", "explanation": "A minimal React counter built with Vite, React, Tailwind CSS and a reusable Counter component. The app displays a number that increments or decrements when the user clicks buttons. Placeholder images from royalty‑free sources (e.g., Pexels) can be inserted later if desired. No backend or database is involved.", "files": { "/App.js": { "code": "// App.js – Entry point for the Vite project\\nimport React from 'react';\\n\\nfunction App() {\\n return (\\n <section className=\\"flex items-center justify-center min-h-screen bg-gray-50 p-8\\">\\n {/* Optional placeholder image – replace src with any royalty‑free URL if needed */}\\n <img src=\\"https://picsum.photos/400\\" alt=\\"Placeholder\\" className=\\"max-w-md max-h-[300px] object-contain\\" />\\n\\n <div className=\\"gap-6\\">\\n <Counter id=\\"counter\\" />\\n </div>\\n </section>\\n );\\n}\\n\\nexport default App;\\n", "/components/Counter.js": { "code": "// Counter.js – Reusable counter component with Tailwind styling\\nimport { useState } from 'react';\\n\\nfunction Counter({ id, initial = 0 }) {\\n const [value, setValue] = useState(initial);\\n\\n return (\\"\\"\\n <div className=\\"relative max-w-sm text-3xl font-bold text-gray-800 bg-white rounded-lg shadow-lg border p-4 flex items-center gap-2\\">\\n <button id=\\"{id}-decrement\\" className=\\"bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors rounded-full px-3 py-1 text-white font-medium\\">\\-</button>\\n <span>{value}</span>\\n <button id=\\"{id}-increment\\" className=\\"bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors rounded-full px-3 py-1 text-white font-medium\\">\\+</button>\\n </div>\\n \\")\\n}\\n\\nexport default Counter;\\n" } }, "generatedFiles": [ "/package.json", "/App.js", "/components/Counter.js" ] }`;

const extractFilesFallback = (text) => {
    const files = {};
    const parts = text.split(/"(\/[^"]+)"\s*:\s*\{\s*"code"\s*:\s*"/);
    
    for (let i = 1; i < parts.length; i += 2) {
        const filename = parts[i];
        let codeAndGarbage = parts[i + 1];
        
        const match = codeAndGarbage.match(/([\s\S]*?)"(?:\s*\}|\s*,|\s*$)/);
        let code = match ? match[1] : codeAndGarbage;
        
        code = code.replace(/\\(.)/g, (m, char) => {
            if (char === 'n') return '\n';
            if (char === 'r') return '\r';
            if (char === 't') return '\t';
            if (char === '"') return '"';
            if (char === '\\') return '\\';
            return char; 
        });
        
        files[filename] = { code };
    }
    return Object.keys(files).length > 0 ? files : null;
};

console.log("EXTRACTED FILES:", Object.keys(extractFilesFallback(jsonText) || {}));
console.log("App.js Code Snippet:", extractFilesFallback(jsonText)["/App.js"].code.substring(0, 50));
console.log("Counter.js Code Snippet:", extractFilesFallback(jsonText)["/components/Counter.js"].code.substring(0, 50));
