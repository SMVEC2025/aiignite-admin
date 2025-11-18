// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RequireAdmin from './components/RequireAdmin';
import Nav from './components/Nav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import AnnouncementsAdmin from './pages/AnnouncementsAdmin';
import TimelineAdmin from './pages/TimelineAdmin';
import './styles/Admin.scss';
import './styles/Mentors.scss';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetails';
import MemberDetail from './pages/MemberDetail';
import Sessions from './pages/Sessions';
import PushNotification from './pages/PushNotification';
import Mentors from './pages/Mentors';
import MentoringSessions from './pages/MentoringSessions';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAdmin>
              <div className="c_admin-shell">
                <Nav />
                <main className="c_admin-main">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/announcements" element={<AnnouncementsAdmin />} />
                    <Route path="/timeline" element={<TimelineAdmin />} />
                    <Route path="/teams" element={<Teams />} />
                    <Route path="/mentors" element={<Mentors />} />
                    <Route path="/mentoring-sessions" element={<MentoringSessions />} />
                    <Route path="/teams/:teamId" element={<TeamDetail />} />
                    <Route path="/teams/:teamId/members/:memberId" element={<MemberDetail />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/push-notification" element={<PushNotification />} />

                  </Routes>
                </main>
              </div>
            </RequireAdmin>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
