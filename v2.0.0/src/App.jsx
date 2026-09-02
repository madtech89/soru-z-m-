import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// Critical landing and auth routes
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AppLayout from "@/app/AppLayout";

// Code-split dynamic routes for ultra-fast initial page load & Lighthouse performance
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const PlacementTest = lazy(() => import("@/pages/PlacementTest"));
const Dashboard = lazy(() => import("@/app/Dashboard"));
const ExamSelect = lazy(() => import("@/app/ExamSelect"));
const Denemeler = lazy(() => import("@/app/Denemeler"));
const ExamPlayer = lazy(() => import("@/app/ExamPlayer"));
const Result = lazy(() => import("@/app/Result"));
const QuestionBank = lazy(() => import("@/app/QuestionBank"));
const WeakTopics = lazy(() => import("@/app/WeakTopics"));
const MistakeLedger = lazy(() => import("@/app/MistakeLedger"));
const DersNotlari = lazy(() => import("@/app/DersNotlari"));
const PuanHesapla = lazy(() => import("@/app/PuanHesapla"));
const Leaderboard = lazy(() => import("@/app/Leaderboard"));
const AICoach = lazy(() => import("@/app/AICoach"));
const AIChat = lazy(() => import("@/app/AIChat"));
const Badges = lazy(() => import("@/app/Badges"));
const ExamReview = lazy(() => import("@/app/ExamReview"));
const Profile = lazy(() => import("@/app/Profile"));
const Admin = lazy(() => import("@/app/Admin"));
const TercihRobotu = lazy(() => import("@/app/TercihRobotu"));
const GeriSayim = lazy(() => import("@/app/GeriSayim"));
const KrediAl = lazy(() => import("@/app/KrediAl"));
const BlogList = lazy(() => import("@/pages/BlogList"));
const BlogDetail = lazy(() => import("@/pages/BlogDetail"));

function RouteLoader() {
  return (
    <div className="min-h-[50vh] grid place-items-center">
      <Loader2 className="animate-spin text-subject-matematik" size={28} />
    </div>
  );
}

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
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/test" element={<PlacementTest />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/admin" element={<Navigate to="/app/admin" replace />} />
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
          <Route path="yanlislarim" element={<RequireAuth><MistakeLedger /></RequireAuth>} />
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
    </Suspense>
  );
}
