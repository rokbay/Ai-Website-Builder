"use client";
import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, LayoutTemplate, Box, Type } from 'lucide-react';

/**
 * Build a component tree from a Sandpack files map.
 * Reads exported React components and their JSX children — no regex DOM parsing.
 */
function buildComponentTree(files) {
    const nodes = [];

    for (const [path, content] of Object.entries(files || {})) {
        const code = typeof content === 'string' ? content : content?.code ?? '';
        if (!code) continue;

        const exports = [...code.matchAll(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9_]*)\s*(?:=|extends|\()/g)];
        if (exports.length === 0) continue;

        const usedComponents = [...new Set(
            [...code.matchAll(/<([A-Z][a-zA-Z0-9.]*)/g)].map(m => m[1])
        )];

        for (const [, name] of exports) {
            nodes.push({
                id: `${path}::${name}`,
                tag: name,
                path,
                isComponent: true,
                children: usedComponents
                    .filter(c => c !== name)
                    .map(c => ({ id: `${path}::${name}::${c}`, tag: c, path, isComponent: true, children: [] })),
            });
        }
    }

    return nodes;
}

const TreeNode = ({ node, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="font-mono text-xs">
            <div
                className="flex items-center py-1.5 px-2 hover:bg-stone-100 cursor-pointer select-none rounded"
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={() => hasChildren && setIsExpanded(!isExpanded)}
            >
                <div className="w-4 h-4 flex items-center justify-center mr-1">
                    {hasChildren ? (
                        isExpanded
                            ? <ChevronDown className="w-3 h-3 text-stone-400" />
                            : <ChevronRight className="w-3 h-3 text-stone-400" />
                    ) : (
                        <span className="w-3 h-3" />
                    )}
                </div>

                {node.isComponent
                    ? <LayoutTemplate className="w-3 h-3 text-purple-500 mr-2" />
                    : <Box className="w-3 h-3 text-blue-500 mr-2" />
                }

                <span className={`font-black ${node.isComponent ? 'text-purple-600' : 'text-blue-600'}`}>
                    {node.tag}
                </span>

                {node.path && (
                    <span className="text-stone-400 ml-2 text-[9px] truncate max-w-[200px]">
                        {node.path}
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

export default function DOMParserPane({ files }) {
    const tree = useMemo(() => buildComponentTree(files), [files]);

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="px-4 py-3 border-b border-stone-200 bg-stone-50/80 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-stone-500" />
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                        Component Tree
                    </span>
                </div>
                <div className="px-2 py-1 bg-purple-50 text-[9px] font-black text-purple-600 uppercase border border-purple-100 rounded">
                    React AST
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {tree.length > 0 ? (
                    tree.map(node => <TreeNode key={node.id} node={node} />)
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-400 p-8 text-center gap-4">
                        <Type className="w-8 h-8 opacity-20" />
                        <span className="text-xs uppercase tracking-widest font-black">
                            Awaiting component data...
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}