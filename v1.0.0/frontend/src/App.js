import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AppLayout from "@/app/AppLayout";
import Dashboard from "@/app/Dashboard";
import ExamSelect from "@/app/ExamSelect";
import Denemeler from "@/app/Denemeler";
import ExamPlayer from "@/app/ExamPlayer";
import Result from "@/app/Result";
import QuestionBank from "@/app/QuestionBank";
import WeakTopics from "@/app/WeakTopics";
import DersNotlari from "@/app/DersNotlari";
import PuanHesapla from "@/app/PuanHesapla";
import Leaderboard from "@/app/Leaderboard";
import AICoach from "@/app/AICoach";
import Profile from "@/app/Profile";
import Admin from "@/app/Admin";
import { Loader2 } from "lucide-react";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null)
    return (
      <div className="min-h-screen grid place-items-center bg-paper">
        <Loader2 className="animate-spin text-subject-matematik" size={32} />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/app"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="sinavlar" element={<ExamSelect />} />
          <Route path="denemeler" element={<Denemeler />} />
          <Route path="deneme/:testId" element={<ExamPlayer />} />
          <Route path="sonuc" element={<Result />} />
          <Route path="soru-bankasi" element={<QuestionBank />} />
          <Route path="eksiklerim" element={<WeakTopics />} />
          <Route path="ders-notlari" element={<DersNotlari />} />
          <Route path="puan-hesapla" element={<PuanHesapla />} />
          <Route path="siralama" element={<Leaderboard />} />
          <Route path="ai-koc" element={<AICoach />} />
          <Route path="profil" element={<Profile />} />
          <Route path="admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
