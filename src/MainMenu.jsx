import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Power, Usb } from 'lucide-react';
import manualIcon from './assets/Manual.png';

const MainMenu = () => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isHovering, setIsHovering] = useState(null);
  const navigate = useNavigate();
  const [showPowerDropdown, setShowPowerDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [userRole, setUserRole] = useState(null);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [powerActive, setPowerActive] = useState(false);

  // Status bar states
  const [machineStatus, setMachineStatus] = useState(1); // 1=IDLE, 2=HOMING, 3=READY
  const [horizontalDistance, setHorizontalDistance] = useState(0);
  const [verticalDistance, setVerticalDistance] = useState(0);
  const [force, setForce] = useState(0);

  // Get user role from localStorage
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserRole(userData.role);
      console.log('User role:', userData.role);
    } else {
      // If no user found, redirect to login
      navigate('/');
    }
  }, [navigate]);

  // Define all menu options
  const allMenuOptions = [
    {
      id: 'test-selection',
      title: 'Test Selection',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Select between 2-Point and 3-Point tests',
      gradient: 'from-teal-500 to-emerald-500',
      allowedRoles: ['admin', 'operator']
    },
    {
      id: 'manual-mode',
      title: 'Manual Mode',
      icon: (
        <img
          src={manualIcon}
          alt="Manual Mode"
          className="w-8 h-8 object-contain"
        />
      ),
      description: 'Manually control the testing process',
      gradient: 'from-purple-500 to-pink-500',
      allowedRoles: ['admin', 'operator']
    },
    {
      id: 'process-logs',
      title: 'Show Process Logs',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      description: 'View detailed process logs and history',
      gradient: 'from-green-500 to-emerald-500',
      allowedRoles: ['admin', 'operator']
    },
    {
      id: 'check-updates',
      title: 'Check for Updates',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      description: 'Check if a newer version is available on GitHub',
      gradient: 'from-indigo-500 to-purple-500',
      allowedRoles: ['admin']
    },
  ];

  // Filter menu options based on user role
  const menuOptions = userRole 
    ? allMenuOptions.filter(option => option.allowedRoles.includes(userRole))
    : [];

  // Function to get status text and color based on R11 value
  const getStatusDisplay = (statusValue) => {
    switch(statusValue) {
      case 1:
        return { text: 'IDLE', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 2:
        return { text: 'HOMING', color: 'text-blue-600', bg: 'bg-blue-100' };
      case 3:
        return { text: 'READY', color: 'text-green-600', bg: 'bg-green-100' };
      default:
        return { text: 'UNKNOWN', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // Function to fetch real-time data
  const fetchRealTimeData = async () => {
    try {
      const data = await window.api.readData();
      if (data && data.success) {
        // Update machine status from R11
        if (data.machineStatus !== undefined) {
          setMachineStatus(data.machineStatus);
        }
        // Update horizontal distance from R71
        if (data.catheterDistance !== undefined) {
          setHorizontalDistance(data.catheterDistance);
        }
        // Update vertical distance from R70
        if (data.distance !== undefined) {
          setVerticalDistance(data.distance);
        }
        // Update force from R54
        if (data.force_mN !== undefined) {
          setForce(data.force_mN);
        }
      }
    } catch (error) {
      console.error('Error fetching real-time data:', error);
    }
  };

  useEffect(() => {
    // Initial checks
    checkInitialConnection();
    checkInitialEmergencyStatus();
    checkInitialPowerStatus();

    // Listen for modbus status updates
    window.addEventListener('modbus-status-change', handleModbusStatus);

    // Listen for emergency status updates
    const handleEmergencyStatus = (event) => {
      setEmergencyActive(event.detail === true);
    };
    window.addEventListener('emergency-status-change', handleEmergencyStatus);

    // Listen for power status updates
    const handlePowerStatus = (event) => {
      setPowerActive(event.detail === true);
    };
    window.addEventListener('power-status-change', handlePowerStatus);

    // Start real-time data fetching
    fetchRealTimeData();
    const intervalId = setInterval(fetchRealTimeData, 500); // Fetch every 500ms

    // Cleanup
    return () => {
      window.removeEventListener('modbus-status-change', handleModbusStatus);
      window.removeEventListener('emergency-status-change', handleEmergencyStatus);
      window.removeEventListener('power-status-change', handlePowerStatus);
      clearInterval(intervalId);
    };
  }, []);

  // Handle modbus status updates
  const handleModbusStatus = (event) => {
    const status = event.detail;
    setConnectionStatus(status);
    setConnectionChecked(true);
    console.log('Modbus status updated:', status);
  };

  // Check initial connection
  const checkInitialConnection = async () => {
    try {
      console.log('Checking initial connection...');
      const status = await window.api.checkConnection();
      setConnectionStatus(status.connected ? 'connected' : 'disconnected');
      setConnectionChecked(true);
      console.log('Initial connection status:', status);
    } catch (error) {
      console.error('Failed to check connection:', error);
      setConnectionStatus('disconnected');
      setConnectionChecked(true);
    }
  };
  
  // Check initial emergency status
  const checkInitialEmergencyStatus = async () => {
    try {
      const status = await window.api.checkEmergencyStatus();
      setEmergencyActive(status.active);
      console.log('Initial emergency status:', status.active);
    } catch (error) {
      console.error('Failed to check emergency status:', error);
    }
  };

  // Check initial power status
  const checkInitialPowerStatus = async () => {
    try {
      const status = await window.api.checkPowerStatus();
      setPowerActive(status.active);
      console.log('Initial power status:', status.active);
    } catch (error) {
      console.error('Failed to check power status:', error);
    }
  };

  // Handle reconnect
  const handleReconnect = async () => {
    try {
      console.log('Attempting to reconnect...');
      const result = await window.api.reconnect();
      if (result.success && result.connected) {
        setConnectionStatus('connected');
        console.log('Reconnect successful');
      } else {
        console.log('Reconnect failed');
      }
    } catch (error) {
      console.error('Reconnect error:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPowerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionClick = async (option) => {
    if (emergencyActive && (option.id === 'load-config' || option.id === 'manual-mode')) {
      return; // Do nothing if emergency is active for these options
    }

    setSelectedOption(option.id);
    console.log(`Selected: ${option.title}`);

    if (option.id === 'test-selection') {
      navigate('/test-selection');
    }
    else if (option.id === 'manual-mode') {
      try {
        console.log('Activating manual mode (non-blocking)...');
        window.api.manual().catch(error => {
          console.error('Manual mode command error (non-blocking):', error);
        });
        navigate('/manual-mode');
      } catch (error) {
        console.error('Navigation error for manual mode:', error);
        navigate('/manual-mode');
      }
    }
    else if (option.id === 'process-logs') {
      navigate('/process-logs');
    }
    else if (option.id === 'check-updates') {
      try {
        console.log('Manually checking for updates...');
        // Dispatch event so UpdateChecker knows it's a manual check
        window.dispatchEvent(new CustomEvent('manual-check-triggered'));
        await window.api.checkForUpdates();
      } catch (error) {
        console.error('Update check error:', error);
      }
    }
  };

  const handleExit = () => {
    const confirmed = window.confirm("Are you sure you want to exit?");
    if (confirmed) {
      window.close();
    }
    setShowPowerDropdown(false);
  };

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('user');
    navigate('/');
    setShowPowerDropdown(false);
  };

  const togglePowerDropdown = () => {
    setShowPowerDropdown(!showPowerDropdown);
  };

  const statusDisplay = getStatusDisplay(machineStatus);

  // Show loading or redirect if no user role
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 shrink-0 ">
      {/* Header */}
      <header className="flex flex-col px-6 py-4 bg-white/80 backdrop-blur-lg shadow-xl border-b border-gray-200/50 relative z-10">
        {/* Top row - Title and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Main Menu
            </h1>
            {/* Display user role badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              userRole === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {userRole === 'admin' ? 'Administrator' : 'Operator'}
            </div>
            {emergencyActive && (
              <div className="bg-red-600 text-white px-4 py-2 rounded-full animate-pulse border-2 border-red-400 shadow-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-bold tracking-wider">EMERGENCY BUTTON ACTIVATED</span>
              </div>
            )}
          </div>

          {/* Connection & Power Status Indicators */}
          <div className="flex items-center gap-3">
            {/* USB Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${connectionStatus === 'connected' ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'} border`}>
              <Usb className={`w-4 h-4 ${connectionStatus === 'connected' ? 'text-green-700' : 'text-red-700'}`} />
              <span className={`text-sm font-medium ${connectionStatus === 'connected' ? 'text-green-700' : 'text-red-700'}`}>
                {connectionStatus === 'connected' ? 'USB Connected' : 'USB Disconnected'}
              </span>
            </div>

            {connectionStatus === 'disconnected' && connectionChecked && (
              <button
                onClick={handleReconnect}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reconnect
              </button>
            )}
            
            {/* Power Button with Logout Option */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={togglePowerDropdown}
                className="group bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl lg:rounded-2xl w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 flex items-center justify-center transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl border border-red-400/30"
              >
                <Power className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 group-hover:scale-110 transition-transform duration-300" />
              </button>
              
              {/* Dropdown Menu */}
              {showPowerDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                  <button
                    onClick={handleExit}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Power className="w-4 h-4" />
                    Exit Application
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom row - Machine Status Bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/50">
          {/* Machine Status */}
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-sm font-medium">Machine Status:</span>
            <div className={`px-3 py-1 rounded-full ${statusDisplay.bg}`}>
              <span className={`text-sm font-bold ${statusDisplay.color}`}>
                {statusDisplay.text}
              </span>
            </div>
          </div>

          {/* Horizontal Distance */}
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-sm font-medium">Horizontal Distance:</span>
            <span className="text-gray-800 text-sm font-mono font-bold bg-gray-100 px-3 py-1 rounded-lg">
              {horizontalDistance.toFixed(1)} mm
            </span>
          </div>

          {/* Vertical Distance */}
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-sm font-medium">Vertical Distance:</span>
            <span className="text-gray-800 text-sm font-mono font-bold bg-gray-100 px-3 py-1 rounded-lg">
              {verticalDistance.toFixed(1)} mm
            </span>
          </div>

          {/* Force */}
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-sm font-medium">Force:</span>
            <span className="text-gray-800 text-sm font-mono font-bold bg-gray-100 px-3 py-1 rounded-lg">
              {force.toFixed(2)} mN
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-8 py-8 xl:py-16 shrink-0 min-h-0">
        <div className="max-w-450 mx-auto">
          <div className="flex flex-col xl:flex-row gap-8 xl:gap-20 items-start xl:items-center">
            {/* Left Section - Menu Options */}
            <div className="w-full xl:flex-1 xl:max-w-3xl">
              <div className="mb-8">
                <p className="text-xl font-semibold text-gray-500">Select an option to continue</p>
              </div>

              <div className="grid gap-5">
                {menuOptions.map((option, index) => (
                  <button
                    key={option.id}
                    className={`group relative bg-white/70 backdrop-blur-sm border-2 rounded-2xl p-8 cursor-pointer transition-all duration-500 flex items-center gap-6 text-left shadow-xl hover:shadow-2xl transform hover:-translate-y-2 overflow-hidden
                      ${option.variant === 'danger'
                        ? 'border-gray-200/50 bg-linear-to-r from-gray-50/80 to-gray-50/80 hover:border-red-400 hover:from-red-100/90 hover:to-rose-100/90'
                        : 'border-gray-200/50 hover:border-blue-400/80 hover:bg-white/90'
                      }
                      ${selectedOption === option.id
                        ? 'border-blue-400 bg-blue-50/80 shadow-blue-200/50'
                        : ''
                      }
                    `}
                    onClick={() => handleOptionClick(option)}
                    onMouseEnter={() => setIsHovering(option.id)}
                    onMouseLeave={() => setIsHovering(null)}
                    disabled={emergencyActive && (option.id === 'load-config' || option.id === 'manual-mode')}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      opacity: (emergencyActive && (option.id === 'load-config' || option.id === 'manual-mode')) ? 0.5 : 1,
                      cursor: (emergencyActive && (option.id === 'load-config' || option.id === 'manual-mode')) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {/* Animated background gradient */}
                    <div className={`absolute inset-0 bg-linear-to-r ${option.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                    {/* Left accent line */}
                    <div className={`absolute left-0 top-0 h-full w-1.5 bg-linear-to-b ${option.gradient} transition-all duration-500 transform scale-y-0 group-hover:scale-y-100 origin-top
                      ${selectedOption === option.id ? 'scale-y-100' : ''}`}></div>

                    {/* Icon container */}
                    <div className={`relative w-16 h-16 flex items-center justify-center rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3
                      ${option.variant === 'danger'
                        ? 'bg-linear-to-br from-gray-100 to-gray-200 text-gray-700 group-hover:from-red-200 group-hover:to-rose-300'
                        : 'bg-linear-to-br from-gray-100 to-gray-200 text-gray-700 group-hover:from-blue-100 group-hover:to-indigo-200 group-hover:text-blue-600'
                      }
                      ${selectedOption === option.id ? 'scale-110 rotate-3' : ''}`}>
                      {option.icon}

                      {/* Glow effect */}
                      <div className={`absolute inset-0 rounded-xl bg-linear-to-br ${option.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm`}></div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-2xl font-bold transition-colors duration-300
                          ${option.variant === 'danger'
                            ? 'text-gray-800 group-hover:text-red-800'
                            : 'text-gray-800 group-hover:text-blue-800'
                          }
                          ${selectedOption === option.id ? 'text-blue-800' : ''}`}>
                          {option.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 leading-relaxed text-base group-hover:text-gray-700 transition-colors duration-300">
                        {option.description}
                      </p>
                    </div>

                    {/* Arrow with enhanced animation */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500 transform
                      ${option.variant === 'danger'
                        ? 'bg-blue-100 text-blue-600 group-hover:bg-red-200 group-hover:text-red-600 group-hover:translate-x-2 group-hover:scale-110'
                        : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200 group-hover:translate-x-2 group-hover:scale-110'
                      }
                      ${selectedOption === option.id ? 'translate-x-2 scale-110' : ''}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:scale-125">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    {/* Hover glow effect */}
                    <div className={`absolute inset-0 rounded-2xl bg-linear-to-r ${option.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none`}></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Section - Product Info */}
            <div className="w-full xl:flex-1 xl:max-w-2xl flex xl:justify-center">
              <div className="bg-white/60 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-white/20 w-full">
                {/* Product Header */}
                <div className="mb-8">
                  <h1 className="text-8xl font-bold bg-linear-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-4 tracking-tight leading-none">
                    FTM
                  </h1>
                  <h2 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6 leading-tight">
                    Flexural Testing Machine
                  </h2>
                </div>

                <p className="text-xl leading-relaxed text-gray-700 mb-10 font-medium">
                  A reliable solution for precise catheter navigation and accurate performance
                  evaluation, designed for accuracy in every test.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="relative z-10 px-4 lg:px-8 py-4 lg:py-6 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 shrink-0 shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-center max-w-500 mx-auto gap-3 lg:gap-0 w-full">
          <div className="flex items-center gap-4 lg:gap-6">
            <p className="text-gray-400 text-sm">Copyright 2026 © Revive Medical Technologies Inc.</p>
            <div className="flex items-center gap-2">
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-6 text-xs lg:text-sm text-gray-400 font-medium">
            <span>Version 1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainMenu;