import React from 'react';
import { Home, ClipboardList, Users, Globe, RefreshCcw, Settings, Menu } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const iconClass = "w-6 h-6 text-white/80 hover:text-white transition-colors cursor-pointer";
  const itemClass = "w-full flex items-center justify-center py-4 hover:bg-white/10 transition-colors relative group";

  return (
    <div className="w-16 h-screen bg-[#A30026] flex flex-col items-center flex-shrink-0 z-50 shadow-xl border-r border-white/10">
      <div className="h-16 flex items-center justify-center w-full bg-[#8a0020]">
        <Menu className="w-6 h-6 text-white" />
      </div>
      
      <div className="flex flex-col w-full mt-4 gap-2">
        <div className={`${itemClass} bg-white/20 border-l-4 border-white`}>
          <Home className="w-6 h-6 text-white" />
          <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Dashboard
          </div>
        </div>
        <div className={itemClass}>
          <ClipboardList className={iconClass} />
        </div>
        <div className={itemClass}>
          <Users className={iconClass} />
        </div>
        <div className={itemClass}>
          <Globe className={iconClass} />
        </div>
        <div className={itemClass}>
          <RefreshCcw className={iconClass} />
        </div>
      </div>

      <div className="mt-auto mb-4 w-full flex flex-col items-center gap-4">
        <div className={itemClass}>
          <Settings className={iconClass} />
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 cursor-pointer hover:border-white transition-colors">
            <img src="https://picsum.photos/100" alt="User" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
};