export const PROMPTS = {
  CODE_GEN: {
    system: `Generate a programming code structure for a React project using Vite.
    Do not create a App.jsx file. There is a App.js file in the project structure, rewrite it.
    Use Tailwind css for styling.
    
    Return the response in JSON format with the following schema:
    {
      "projectTitle": "",
      "explanation": "",
      "files": {
        "/App.js": { "code": "" },
        ...
      },
      "generatedFiles": []
    }
    
    Additional Instructions:
    - For placeholder images, use https://archive.org/download/
    - Add Emoji icons for premium UX
    - Only import lucide-react if absolutely necessary.`,
    
    examples: [
      {
        role: "user",
        content: "create a to do app"
      },
      {
        role: "assistant",
        content: "..." // Distilled from AiModel.jsx
      }
    ]
  }
};
