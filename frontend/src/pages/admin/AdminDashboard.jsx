import { useEffect, useState } from "react";
import { 
  Plane, LogOut, LayoutDashboard, Users as UsersIcon, Zap, Calendar, Activity, FileText 
} from 'lucide-react';

import { 
  getAdminBookings, 
  getAdminUsers, 
  getAdminFlights, 
  getAdminStats, 
  deleteAdminUser, 
  deleteAdminFlight,
  getAdminSchedules,
  getAdminCrew,
  getAdminOperations,
  getAdminReports
} from "../../services/api";

import UsersPage from "./Users";
import SchedulesPage from "./schedules/Schedules";
import ReportsPage from "./reports/Reports";
import OperationsPage from "./operations/Operations";
import FlightsPage from "./flights/Flights";
import CrewMembersPage from './crew/CrewMembers';
import LoadingAnimation from "../../components/LoadingAnimation";

import "../../styles/common-theme.css";
import "../../styles/AdminDashboard.css";
import "../../styles/AdminPages.css";

// ================== Small StatCard component ==================
const StatCard = ({ title, value, trend, icon: Icon }) => {
  const isPositive = trend && (trend.includes('Up') || trend.includes('+'));
  const trendColor = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <div className="stat-card">
      <div className="flex justify-between items-start">
        <div>
          <h4>{title}</h4>
          <p>{value}</p>
        </div>
        {Icon && <Icon size={24} className="text-blue-400 opacity-80" />}
      </div>
      {trend && (
        <div className={`mt-3 text-sm font-medium ${trendColor}`}>
          {trend}
        </div>
      )}
    </div>
  );
};

// ================== Dashboard Placeholder ==================
const Dashboard = ({ bookings, stats }) => {
  const kpiData = [
    { title: "Total Bookings", value: bookings.length, trend: "Up 5%", icon: Zap },
    { title: "Total Users", value: stats.total_users || 0, trend: "Up 2%", icon: UsersIcon },
    { title: "Flights Today", value: stats.total_flights_today || 0, trend: "On track", icon: Plane },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 className="main-title" style={{ margin: 0 }}>Hi, Admin</h1>
      </div>

      {/* KPI CARDS */}
      <div className="kpi-row">
        {kpiData.map(kpi => (
          <StatCard 
            key={kpi.title} 
            title={kpi.title} 
            value={kpi.value} 
            trend={kpi.trend} 
            icon={kpi.icon} 
          />
        ))}
      </div>

      {/* UPCOMING BOOKINGS */}
      <h2 className="section-title">Upcoming Bookings</h2>
      <div className="bookings-list">
        {bookings.slice(0, 4).map(b => (
          <div key={b.id} className="booking-card">
            <div>
              <div className="booking-flight-name">{b.flight_name}</div>
              <div>{b.origin} → {b.destination}</div>
              <div>Passenger: {b.user_name || "Guest"} ({b.email || "No email"})</div>
              <div>Seats: {b.seats_booked || 1}</div>
            </div>
            <div className={`booking-status ${
              b.status === "On Time" || b.status === "On time" ? "status-ontime" :
              b.status === "Departed" ? "status-departed" :
              b.status === "Cancelled" || b.status === "cancelled" ? "status-cancelled" :
              "status-pending"
            }`}>
              {b.status}
            </div>
          </div>
        ))}
        {bookings.length > 4 && (
          <a className="sidebar-nav-link text-center mt-3" href="#bookings">
            View All Bookings &rarr;
          </a>
        )}
      </div>
    </>
  );
};

// ================== Admin Dashboard ==================
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');

  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [flights, setFlights] = useState([]);
  const [stats, setStats] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [crew, setCrew] = useState([]);
  const [operations, setOperations] = useState([]);
  const [reports, setReports] = useState([]);

  // Fetch all admin data
  useEffect(() => {
    const fetchAllAdminData = async () => {
      try {
        setLoading(true);
        setShowLoadingAnimation(true);
        setDataLoaded(false);
        
        const [
          bookingsData, 
          usersData, 
          flightsData, 
          statsData,
          schedulesData,
          crewData,
          operationsData,
          reportsData
        ] = await Promise.all([
          getAdminBookings(),
          getAdminUsers(),
          getAdminFlights(),
          getAdminStats(),
          getAdminSchedules(),
          getAdminCrew(),
          getAdminOperations(),
          getAdminReports()
        ]);

        setBookings(bookingsData);
        setUsers(usersData);
        setFlights(flightsData);
        setStats(statsData);

        setSchedules(schedulesData);
        setCrew(crewData);
        setOperations(operationsData);
        setReports(reportsData);

        // Mark data as loaded
        setDataLoaded(true);
        
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data");
        setDataLoaded(true); // Even on error, mark as loaded to hide animation
      } finally {
        setLoading(false);
        // Hide loading animation after a brief delay to ensure smooth transition
        setTimeout(() => {
          setShowLoadingAnimation(false);
        }, 400);
      }
    };

    fetchAllAdminData();
  }, []);

  // Delete handlers
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteAdminUser(userId);
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    }
  };

  const handleDeleteFlight = async (flightId) => {
    if (!window.confirm("Are you sure you want to delete this flight?")) return;
    try {
      await deleteAdminFlight(flightId);
      setFlights(prev => prev.filter(f => f.flight_id !== flightId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete flight");
    }
  };

  // Handle page switching
  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  // Show loading animation while loading or if showLoadingAnimation is true
  if (loading || showLoadingAnimation) {
    return (
      <div className="dashboard-container" style={{ position: "relative", height: "100vh", width: "100vw" }}>
        <LoadingAnimation isLoading={loading || !dataLoaded} />
      </div>
    );
  }

  if (error) return <div className="main-content" style={{ color: "red" }}>{error}</div>;

  return (
    <div className="dashboard-container" style={{ position: "relative" }}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <a className={`sidebar-nav-link ${activeTab==='dashboard'?'active':''}`} onClick={()=>handleTabChange('dashboard')}>
            <LayoutDashboard size={18} /> Dashboard
          </a>
          <a className={`sidebar-nav-link ${activeTab==='flights'?'active':''}`} onClick={()=>handleTabChange('flights')}>
            <Plane size={18} /> Flights
          </a>
          <a className={`sidebar-nav-link ${activeTab==='users'?'active':''}`} onClick={()=>handleTabChange('users')}>
            <UsersIcon size={18} /> Users
          </a>
          <a className={`sidebar-nav-link ${activeTab==='schedules'?'active':''}`} onClick={()=>handleTabChange('schedules')}>
            <Calendar size={18} /> Schedules
          </a>
          <a className={`sidebar-nav-link ${activeTab==='crewmembers'?'active':''}`} onClick={()=>handleTabChange('crewmembers')}>
            <UsersIcon size={18} /> Crew Members
          </a>
          <a className={`sidebar-nav-link ${activeTab==='operations'?'active':''}`} onClick={()=>handleTabChange('operations')}>
            <Activity size={18} /> Operations
          </a>
          <a className={`sidebar-nav-link ${activeTab==='reports'?'active':''}`} onClick={()=>handleTabChange('reports')}>
            <FileText size={18} /> Reports
          </a>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {activeTab==='dashboard' && <Dashboard bookings={bookings} stats={stats} />}
        {activeTab==='flights' && <FlightsPage flights={flights} deleteFlight={handleDeleteFlight} />}
        {activeTab==='users' && <UsersPage users={users} deleteUser={handleDeleteUser} />}
        {activeTab==='schedules' && <SchedulesPage schedules={schedules} />}
        {activeTab==='crewmembers' && <CrewMembersPage crew={crew} />}
        {activeTab==='operations' && <OperationsPage operations={operations} />}
        {activeTab==='reports' && <ReportsPage reports={reports} />}
      </div>
    </div>
  );
}
