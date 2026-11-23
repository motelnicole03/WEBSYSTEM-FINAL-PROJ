import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import EmployerHome from './pages/EmployerHome';
import Jobs from './pages/Jobs';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MyApplications from './pages/MyApplications';
import Profile from './pages/Profile';
import Register from './pages/Register';
import SavedInternships from './pages/SavedInternships';
import { NotFound, Reviews } from './pages/Simple';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        {/* One route with an optional id, so picking a card does not remount the page */}
        <Route path="/jobs/:id?" element={<Jobs />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/employer"
          element={
            <RequireRole roles={['employer']}>
              <EmployerHome />
            </RequireRole>
          }
        />
        <Route path="/applications" element={<RequireRole roles={['student']}><MyApplications /></RequireRole>} />
        <Route path="/saved" element={<RequireRole roles={['student']}><SavedInternships /></RequireRole>} />
        <Route path="/profile" element={<RequireRole roles={['student']}><Profile /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
