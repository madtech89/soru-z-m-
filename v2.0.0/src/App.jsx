import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";
import PlacementTest from "@/pages/PlacementTest";
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
import AIChat from "@/app/AIChat";
import Badges from "@/app/Badges";
import ExamReview from "@/app/ExamReview";
import Profile from "@/app/Profile";
import Admin from "@/app/Admin";
import TercihRobotu from "@/app/TercihRobotu";
import GeriSayim from "@/app/GeriSayim";
import KrediAl from "@/app/KrediAl";
import BlogList from "@/pages/BlogList";
import BlogDetail from "@/pages/BlogDetail";
import { Loader2 } from "lucide-react";

function AppShell() {
  const { loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-paper">
        <Loader2 className="animate-spin text-subject-matematik" size={32} />
      </div>
    );
  return <AppLayout />;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading)
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
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/test" element={<PlacementTest />} />
      <Route path="/blog" element={<BlogList />} />
      <Route path="/blog/:slug" element={<BlogDetail />} />
      <Route
        path="/app"
        element={
          <AppShell />
        }
      >
        <Route index element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="sinavlar" element={<RequireAuth><ExamSelect /></RequireAuth>} />
        <Route path="denemeler" element={<RequireAuth><Denemeler /></RequireAuth>} />
        <Route path="deneme/:testId" element={<RequireAuth><ExamPlayer /></RequireAuth>} />
        <Route path="sonuc" element={<RequireAuth><Result /></RequireAuth>} />
        <Route path="soru-bankasi" element={<RequireAuth><QuestionBank /></RequireAuth>} />
        <Route path="eksiklerim" element={<RequireAuth><WeakTopics /></RequireAuth>} />
        <Route path="ders-notlari" element={<RequireAuth><DersNotlari /></RequireAuth>} />
        <Route path="puan-hesapla" element={<PuanHesapla />} />
        <Route path="tercih-robotu" element={<TercihRobotu />} />
        <Route path="geri-sayim" element={<GeriSayim />} />
        <Route path="siralama" element={<RequireAuth><Leaderboard /></RequireAuth>} />
        <Route path="ai-koc" element={<RequireAuth><AICoach /></RequireAuth>} />
        <Route path="ai-sohbet" element={<RequireAuth><AIChat /></RequireAuth>} />
        <Route path="rozetler" element={<RequireAuth><Badges /></RequireAuth>} />
        <Route path="incele/:testId/:sessionId" element={<RequireAuth><ExamReview /></RequireAuth>} />
        <Route path="incele/:testId" element={<RequireAuth><ExamReview /></RequireAuth>} />
        <Route path="profil" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="kredi-al" element={<RequireAuth><KrediAl /></RequireAuth>} />
        <Route path="admin" element={<RequireAuth><Admin /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
