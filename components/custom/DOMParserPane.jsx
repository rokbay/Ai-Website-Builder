import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, LayoutTemplate, Type, Box } from 'lucide-react';

const parseJSX = (code) => {
  // A lightweight static regex-based JSX parser to build a DOM tree
  const tags = [];
  const regex = /<(\/)?([a-zA-Z0-9.]+)([^>]*)>/g;
  let match;
  let idCounter = 0;
  const root = { id: 'root', type: 'root', children: [] };
  const stack = [root];

  while ((match = regex.exec(code)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    const attributesRaw = match[3];

    // Skip self-closing or empty matches for basic structural view
    const isSelfClosing = attributesRaw.trim().endsWith('/') || 
                          tagName.toLowerCase() === 'img' || 
                          tagName.toLowerCase() === 'input' ||
                          tagName.toLowerCase() === 'br' ||
                          tagName.toLowerCase() === 'hr';

    let className = '';
    const classMatch = attributesRaw.match(/className=["']([^"']+)["']/);
    if (classMatch) className = classMatch[1];

    if (!isClosing) {
      const node = {
        id: `node-${idCounter++}`,
        tag: tagName,
        className,
        isComponent: tagName.charAt(0) === tagName.charAt(0).toUpperCase(),
        children: []
      };

      stack[stack.length - 1].children.push(node);
      
      if (!isSelfClosing) {
        stack.push(node);
      }
    } else {
      // Find matching open tag
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tag === tagName) {
          stack.length = i; // Pop everything up to this tag
          break;
        }
      }
    }
  }
  return root.children;
};

const TreeNode = ({ node, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="font-mono text-xs">
      <div 
        className={`flex items-center py-1.5 px-2 hover:bg-white/5 cursor-pointer select-none rounded`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div className="w-4 h-4 flex items-center justify-center mr-1">
          {hasChildren ? (
             isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />
          ) : (
            <span className="w-3 h-3" />
          )}
        </div>
        
        {node.isComponent ? (
            <LayoutTemplate className="w-3 h-3 text-purple-400 mr-2" />
        ) : (
            <Box className="w-3 h-3 text-blue-400 mr-2" />
        )}

        <span className={`${node.isComponent ? 'text-purple-300' : 'text-blue-300'} font-black`}>
          {node.tag}
        </span>

        {node.className && (
            <span className="text-slate-500 ml-2 truncate max-w-[300px]" title={node.className}>
                .{node.className.split(' ').join('.')}
            </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function DOMParserPane({ code }) {
    const tree = useMemo(() => parseJSX(code || ''), [code]);

    return (
        <div className="h-full flex flex-col bg-[#0a0a0a]">
            <div className="px-4 py-3 border-b border-white/5 bg-black/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DOM & CSSOM Structure</span>
                </div>
                <div className="px-2 py-1 bg-blue-500/10 rounded text-[9px] font-black text-blue-400 uppercase border border-blue-500/20">
                    Live AST Sync
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {tree.length > 0 ? (
                    tree.map(node => <TreeNode key={node.id} node={node} />)
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center gap-4">
                        <Type className="w-8 h-8 opacity-20" />
                        <span className="text-xs uppercase tracking-widest font-black">Awaiting Structural Data...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
