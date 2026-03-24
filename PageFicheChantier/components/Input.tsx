
import React, { useState, useRef, useEffect } from 'react';
import { Cable, Search, Check, ChevronDown, X } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  fullWidth?: boolean;
  isTextArea?: boolean;
  rows?: number;
}

export const Input: React.FC<InputProps> = ({ label, fullWidth = true, className = '', readOnly, isTextArea = false, rows = 3, ...props }) => {
  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </label>
      {isTextArea ? (
        <textarea
          readOnly={readOnly}
          rows={rows}
          className={`px-3 py-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded outline-none transition-all shadow-sm placeholder-gray-400 resize-none
            ${readOnly
              ? 'bg-gray-50 text-gray-600 border-gray-200 cursor-default focus:ring-0'
              : 'focus:ring-2 focus:ring-[#c2002f] focus:border-[#c2002f]'} 
            ${className}`}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          readOnly={readOnly}
          className={`px-3 py-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded outline-none transition-all shadow-sm placeholder-gray-400 
            ${readOnly
              ? 'bg-gray-50 text-gray-600 border-gray-200 cursor-default focus:ring-0'
              : 'focus:ring-2 focus:ring-[#c2002f] focus:border-[#c2002f]'} 
            ${className}`}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, className = '', readOnly, ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </label>
      <textarea
        readOnly={readOnly}
        className={`px-3 py-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded outline-none transition-all shadow-sm placeholder-gray-400 resize-none
          ${readOnly
            ? 'bg-gray-50 text-gray-600 border-gray-200 cursor-default focus:ring-0'
            : 'focus:ring-2 focus:ring-[#c2002f] focus:border-[#c2002f]'} 
          ${className}`}
        {...props}
      />
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[]; readOnly?: boolean }> = ({ label, options, className = '', disabled, readOnly, ...props }) => {
  const isDisabled = disabled || readOnly;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <select
          disabled={isDisabled}
          className={`appearance-none w-full px-3 py-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded outline-none transition-all shadow-sm
             ${isDisabled
              ? 'bg-gray-50 text-gray-600 border-gray-200 cursor-default focus:ring-0'
              : 'focus:ring-2 focus:ring-[#c2002f] focus:border-[#c2002f]'}
            ${className}`}
          {...props}
        >
          <option value="" disabled selected={!props.value}>Select an option...</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {!disabled && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
          </div>
        )}
      </div>
    </div>
  );
};

export const CableSelect: React.FC<{
  label: string;
  values: string[]; // Changed from value: string to values: string[]
  onChange: (values: string[]) => void;
  options: string[];
  readOnly?: boolean;
}> = ({ label, values, onChange, options, readOnly }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addCable = (cable: string) => {
    onChange([...values, cable]);
  };

  const removeCable = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    onChange(newValues);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full" ref={containerRef}>
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </label>

      {/* Selected Cables List */}
      <div className="space-y-2 mb-2">
        {values.map((cable, idx) => (
          <div key={idx} className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded text-sm text-[#A30026]">
            <div className="flex items-center gap-2">
              <Cable className="w-4 h-4" />
              <span>{cable}</span>
            </div>
            {!readOnly && (
              <button
                onClick={() => removeCable(idx)}
                className="hover:bg-red-100 p-1 rounded-full transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {values.length === 0 && <div className="text-sm text-gray-400 italic px-1">Aucun câble sélectionné</div>}
      </div>

      <div className="relative">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded outline-none transition-all shadow-sm text-sm
            ${readOnly ? 'bg-gray-50 border-gray-200 cursor-default' : 'border-gray-300 focus:ring-2 focus:ring-[#c2002f] focus:border-[#c2002f]'}`}
        >
          <div className="flex items-center gap-2 text-gray-900">
            <span className="text-gray-600">Ajouter un câble...</span>
          </div>
          {!readOnly && <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {isOpen && !readOnly && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  addCable(opt);
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2.5 hover:bg-red-50 cursor-pointer text-sm text-gray-700 transition-colors"
              >
                <Cable className="w-4 h-4 text-gray-400" />
                <span>{opt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const AccessoryList: React.FC<{
  label: string;
  selectedItems: string[];
  onChange: (items: string[]) => void;
  options: string[];
  readOnly?: boolean;
}> = ({ label, selectedItems, onChange, options, readOnly }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = (item: string) => {
    if (readOnly) return;
    onChange([...selectedItems, item]);
  };

  const removeItem = (index: number) => {
    if (readOnly) return;
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full h-full">
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </label>
      <div className={`flex flex-col border rounded-md bg-white overflow-hidden shadow-sm h-64 ${readOnly ? 'border-gray-200 bg-gray-50' : 'border-gray-300 focus-within:ring-2 focus-within:ring-[#c2002f] focus-within:border-[#c2002f]'}`}>

        {/* Search Bar - only for adding */}
        {!readOnly && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher pour ajouter..."
              className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        <div className="flex-1 overflow-auto p-1 grid grid-cols-1 gap-0">
          {/* 1. Show Selected Items at the top with Remove button */}
          {selectedItems.length > 0 && (
            <div className="bg-red-50/50 p-2 mb-2 rounded border border-red-50">
              <div className="text-xs font-semibold text-[#A30026] mb-2 uppercase">Sélectionnés ({selectedItems.length})</div>
              <div className="space-y-1">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-2 py-1.5 bg-white border border-red-100 rounded text-sm text-gray-800 shadow-sm animate-in slide-in-from-left-2 duration-300">
                    <span>{item}</span>
                    {!readOnly && <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Show Options to Add */}
          {!readOnly && (
            <div className="pt-2">
              <div className="text-xs font-semibold text-gray-400 px-2 mb-1 uppercase">Disponible</div>
              {filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => (
                <div
                  key={`${opt}-${idx}`}
                  onClick={() => addItem(opt)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer text-sm hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center bg-white" />
                  <span className="leading-snug">{opt}</span>
                </div>
              )) : (
                <div className="px-4 py-4 text-center text-sm text-gray-400 italic">Aucun élément trouvé</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Boolean Checkbox Component
export const BooleanCheckbox: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  readOnly?: boolean;
  description?: string;
}> = ({ label, value, onChange, readOnly, description }) => {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => !readOnly && onChange(e.target.checked)}
        disabled={readOnly}
        className={`mt-0.5 w-5 h-5 rounded border-gray-300 text-[#A30026] transition-colors ${readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer focus:ring-2 focus:ring-[#A30026]'
          }`}
      />
      <div className="flex-1">
        <label className={`text-sm font-medium text-gray-900 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {value && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <Check className="w-3 h-3" />
          <span>Actif</span>
        </div>
      )}
    </div>
  );
};

// Multi-Select Checkbox Component (for Typedetravaux)
export const MultiSelectCheckbox: React.FC<{
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  readOnly?: boolean;
}> = ({ label, options, selectedValues, onChange, readOnly }) => {
  const toggleOption = (option: string) => {
    if (readOnly) return;
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option);
          return (
            <div
              key={option}
              onClick={() => toggleOption(option)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${isSelected
                ? 'border-[#A30026] bg-red-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
                  ? 'border-[#A30026] bg-[#A30026]'
                  : 'border-gray-300 bg-white'
                  }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm font-medium ${isSelected ? 'text-[#A30026]' : 'text-gray-700'}`}>
                {option}
              </span>
            </div>
          );
        })}
      </div>
      {selectedValues.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedValues.map((value) => (
            <div
              key={value}
              className="flex items-center gap-1.5 px-2 py-1 bg-[#A30026] text-white rounded-full text-xs font-medium"
            >
              <span>{value}</span>
              {!readOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(value);
                  }}
                  className="hover:bg-red-800 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
