import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  ConciergeBell, 
  Receipt, 
  ScanLine, 
  Moon, 
  Percent, 
  FileText 
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tapechart', label: 'Frontdesk Tape Chart', icon: CalendarDays },
    { id: 'frontdesk', label: 'Frontdesk Operations', icon: ConciergeBell },
    { id: 'folios', label: 'Folio Operations', icon: Receipt },
    { id: 'idscan', label: 'ID Scanner', icon: ScanLine },
    { id: 'nightaudit', label: 'Night Audit', icon: Moon },
    { id: 'taxconfig', label: 'Tax Configuration', icon: Percent },
    { id: 'reports', label: 'Reports & Analytics Center', icon: FileText }
  ];

  return (
    <aside className="pms-sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
              {isActive && <div className="active-indicator" />}
            </button>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <div className="currency-pill">
          <span>CURRENCY</span>
          <strong>USD ($)</strong>
        </div>
      </div>
    </aside>
  );
};
