'use client'
import { useState, useRef, useEffect, useCallback } from 'react';
import { Calculator } from 'lucide-react';

export default function Calculators() {
    const [isOpen, setIsOpen] = useState(false);
    const [display, setDisplay] = useState('0');
    const [expression, setExpression] = useState('');
    const [position, setPosition] = useState({ x: 0, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef(null);
    const offsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setPosition({ x: window.innerWidth - 320, y: 100 });
    }, []);
    // Handle drag start
    const handleMouseDown = useCallback((e) => {
        setIsDragging(true);
        offsetRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    }, [position]);

    // Handle drag move
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - offsetRef.current.x,
                y: e.clientY - offsetRef.current.y,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Calculator functions
    const handleNumber = (num) => {
        if (display === '0' || display === 'Error') {
            setDisplay(num);
        } else {
            setDisplay(display + num);
        }
    };

    const handleOperator = (op) => {
        setDisplay(display + op);
    };

    const handleDecimal = () => {
        const parts = display.split(/[\+\-\*\/]/);
        const lastPart = parts[parts.length - 1];
        if (!lastPart.includes('.')) {
            setDisplay(display + '.');
        }
    };

    const handleClear = () => {
        setDisplay('0');
        setExpression('');
    };

    const handleDelete = () => {
        if (display.length === 1 || display === 'Error') {
            setDisplay('0');
        } else {
            setDisplay(display.slice(0, -1));
        }
    };

    const calculate = () => {
        try {
            const sanitized = display.replace(/[^0-9+\-*/().]/g, '');
            const result = Function(`"use strict"; return (${sanitized})`)();

            if (typeof result !== 'number' || !isFinite(result)) {
                setDisplay('Error');
            } else {
                const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(2);
                setExpression(display + ' =');
                setDisplay(formatted);
            }
        } catch (e) {
            setDisplay('Error');
        }
    };

    // ========== NEW: Keyboard Support ==========
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            // Allow keyboard shortcuts only when calculator is open
            const key = e.key;

            // Numbers 0-9
            if (key >= '0' && key <= '9') {
                e.preventDefault();
                handleNumber(key);
            }
            // Operators
            else if (key === '+') {
                e.preventDefault();
                handleOperator('+');
            }
            else if (key === '-') {
                e.preventDefault();
                handleOperator('-');
            }
            else if (key === '*') {
                e.preventDefault();
                handleOperator('*');
            }
            else if (key === '/') {
                e.preventDefault();
                handleOperator('/');
            }
            else if (key === '%') {
                e.preventDefault();
                handleOperator('%');
            }
            // Decimal point
            else if (key === '.') {
                e.preventDefault();
                handleDecimal();
            }
            // Calculate (Enter or =)
            else if (key === 'Enter' || key === '=') {
                e.preventDefault();
                calculate();
            }
            // Backspace to delete
            else if (key === 'Backspace') {
                e.preventDefault();
                handleDelete();
            }
            // Delete or Escape to clear
            else if (key === 'Delete' || key === 'Escape') {
                e.preventDefault();
                handleClear();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, display]); // Re-attach when display changes

    const buttons = [
        ['C', '⌫', '%', '/'],
        ['7', '8', '9', '*'],
        ['4', '5', '6', '-'],
        ['1', '2', '3', '+'],
        ['0', '.', '='],
    ];

    const getButtonClass = (btn) => {
        if (btn === '=') return 'bg-blue-600 hover:bg-blue-700 text-white font-bold';
        if (btn === 'C') return 'bg-red-500 hover:bg-red-600 text-white font-bold';
        if (btn === '⌫') return 'bg-orange-500 hover:bg-orange-600 text-white';
        if (['/', '*', '-', '+', '%'].includes(btn)) return 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold';
        return 'bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium';
    };

    const handleButtonClick = (btn) => {
        switch (btn) {
            case 'C': handleClear(); break;
            case '⌫': handleDelete(); break;
            case '=': calculate(); break;
            case '+': case '-': case '*': case '/': case '%': handleOperator(btn); break;
            case '.': handleDecimal(); break;
            default: handleNumber(btn);
        }
    };

    return (
        <>
            {/* Toggle Button - Always visible */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer relative"
                title="Calculator"
            >
                <Calculator className="w-5 h-5" />
            </button>

            {/* Calculator Modal */}
            {isOpen && (
                <div
                    ref={dragRef}
                    style={{
                        position: 'fixed',
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        zIndex: 9999,
                    }}
                    className="bg-white rounded-xl shadow-2xl border border-gray-200 w-72 overflow-hidden"
                >
                    {/* Header - Draggable */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 flex items-center justify-between cursor-move select-none"
                    >
                        <span className="text-white text-sm font-semibold">Calculator</span>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:text-gray-200 cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Display */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        {expression && (
                            <div className="text-xs text-gray-400 text-right mb-1">{expression}</div>
                        )}
                        <div className="text-2xl font-bold text-gray-900 text-right overflow-hidden">
                            {display}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="p-3">
                        <div className="grid grid-cols-4 gap-2">
                            {buttons.map((row, i) => {
                                // Handle the special case for row with 3 buttons
                                if (i === 4) {
                                    return (
                                        <div key={i} className="col-span-4 grid grid-cols-4 gap-2">
                                            {row.slice(0, 2).map((btn) => (
                                                <button
                                                    key={btn}
                                                    onClick={() => handleButtonClick(btn)}
                                                    className={`${getButtonClass(btn)} h-12 rounded-lg text-lg transition-colors cursor-pointer active:scale-95`}
                                                >
                                                    {btn}
                                                </button>
                                            ))}
                                            <button
                                                key="="
                                                onClick={() => handleButtonClick('=')}
                                                className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg text-lg transition-colors cursor-pointer active:scale-95"
                                            >
                                                =
                                            </button>
                                        </div>
                                    );
                                }
                                return row.map((btn) => (
                                    <button
                                        key={btn}
                                        onClick={() => handleButtonClick(btn)}
                                        className={`${getButtonClass(btn)} h-12 rounded-lg text-lg transition-colors cursor-pointer active:scale-95`}
                                    >
                                        {btn}
                                    </button>
                                ));
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}