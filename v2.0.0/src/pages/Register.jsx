import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Phone, ShieldCheck, Mail, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { AuthShell } from "@/pages/Login";

const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-subject-matematik focus:ring-2 focus:ring-subject-matematik/20 transition";
const checkCls = "h-5 w-5 rounded border-zinc-300 text-subject-matematik focus:ring-subject-matematik/20 cursor-pointer";

function LegalModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">&times;</button>
        </div>
        <div className="text-sm text-zinc-600 leading-relaxed space-y-3">{children}</div>
      </div>
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [kvkk, setKvkk] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);

  const phoneValid = phone.replace(/\D/g, "").length >= 10;

  const submit = async (e) => {
    e.preventDefault();
    if (!kvkk) {
      toast.error("KVKK Aydınlatma Metni'ni kabul etmeniz gerekiyor.");
      return;
    }
    if (!phoneValid) {
      toast.error("Geçerli bir telefon numarası giriniz.");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, phone, { kvkk, marketing });
      toast.success("Hesabın oluşturuldu!");
      nav("/onboarding");
    } catch (err) {
      toast.error(err.message || "Kayıt yapılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Yolculuğa başla" subtitle="Ücretsiz hesap oluştur, sınavını seç, ilk denemeni çöz.">
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        <input data-testid="register-name" required placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        <input data-testid="register-email" type="email" required placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />

        <div className="relative">
          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            data-testid="register-phone"
            type="tel"
            required
            placeholder="Cep Telefonu (5XX XXX XX XX)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls + " pl-10"}
            inputMode="tel"
          />
        </div>

        <input data-testid="register-password" type="password" required minLength={6} placeholder="Şifre (en az 6 karakter)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />

        {/* KVKK Consent */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={kvkk}
              onChange={(e) => setKvkk(e.target.checked)}
              className={checkCls + " mt-0.5"}
              data-testid="kvkk-consent"
            />
            <span className="text-sm text-zinc-600 leading-relaxed">
              <button type="button" onClick={() => setModal("kvkk")} className="text-subject-matematik font-semibold underline underline-offset-2">KVKK Aydınlatma Metni</button>'ni okudum, kişisel verilerimin işlenmesine onay veriyorum.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className={checkCls + " mt-0.5"}
              data-testid="marketing-consent"
            />
            <span className="text-sm text-zinc-600 leading-relaxed">
              <button type="button" onClick={() => setModal("marketing")} className="text-subject-matematik font-semibold underline underline-offset-2">Pazarlama İzni</button> metnini okudum; e-posta, SMS ve bildirimler aracılığıyla kampanya ve duyurulardan haberdar olmayı kabul ediyorum.
            </span>
          </label>

          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            <button type="button" onClick={() => setModal("terms")} className="text-xs text-zinc-500 hover:text-subject-matematik underline underline-offset-2">Kullanım Koşulları</button>
            <button type="button" onClick={() => setModal("privacy")} className="text-xs text-zinc-500 hover:text-subject-matematik underline underline-offset-2">Gizlilik Politikası</button>
            <button type="button" onClick={() => setModal("cookie")} className="text-xs text-zinc-500 hover:text-subject-matematik underline underline-offset-2">Çerez Politikası</button>
          </div>
        </div>

        <button data-testid="register-submit" disabled={loading || !kvkk} className="w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3 rounded-xl hover:bg-subject-matematik transition-colors disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <>Hesap oluştur <ArrowRight size={17} /></>}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-500">
        Zaten hesabın var mı?{" "}
        <Link to="/login" className="text-subject-matematik font-semibold" data-testid="go-login">Giriş yap</Link>
      </p>

      {modal === "kvkk" && (
        <LegalModal title="KVKK Aydınlatma Metni" onClose={() => setModal(null)}>
          <p><strong>1. Veri Sorumlusu</strong></p>
          <p>Netor ("Şirket"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusudur.</p>
          <p><strong>2. İşlenen Kişisel Veriler</strong></p>
          <p>Ad soyad, e-posta adresi, cep telefonu numarası, sınav tercihleri, çözüm sonuçları ve platform kullanım verileriniz işlenmektedir.</p>
          <p><strong>3. İşleme Amaçları</strong></p>
          <p>Kişisel verileriniz; üyelik işlemlerinin gerçekleştirilmesi, sınav hazırlık süreçlerinizin kişiselleştirilmesi, eksik konularınızın tespiti, platformumuzun iyileştirilmesi ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmektedir.</p>
          <p><strong>4. Verilerin Aktarılması</strong></p>
          <p>Kişisel verileriniz, hizmetin sunulması için gerekli olan bulut altyapı sağlayıcıları ve analiz hizmetleriyle sınırlı olarak yurt dışına aktarılabilir.</p>
          <p><strong>5. Haklarınız</strong></p>
          <p>KVKK'nın 11. maddesi kapsamında; verilerinize erişme, düzeltme, silme ve işlemenin sınırlandırılmasını talep etme haklarınız bulunmaktadır.</p>
        </LegalModal>
      )}

      {modal === "marketing" && (
        <LegalModal title="Pazarlama İzni" onClose={() => setModal(null)}>
          <p>Pazarlama izni kapsamında; e-posta, SMS ve push bildirimleri aracılığıyla size özel kampanyalar, yeni özellik duyuruları ve sınav hazırlık tavsiyeleri gönderebiliriz.</p>
          <p>Bu izni istediğiniz zaman profil ayarlarınızdan veya bildirimlerdeki "Abonelikten Çık" bağlantısıyla geri çekebilirsiniz.</p>
          <p>Pazarlama izni vermemiz, hizmetin kullanımı için zorunlu değildir. İzin vermeseniz de platformun tüm temel özelliklerini kullanabilirsiniz.</p>
        </LegalModal>
      )}

      {modal === "terms" && (
        <LegalModal title="Kullanım Koşulları" onClose={() => setModal(null)}>
          <p>Netor platformunu kullanarak bu koşulları kabul etmiş olursunuz. Platform yalnızca kişisel kullanım içindir ve içeriğin izinsiz kopyalanması yasaktır.</p>
          <p>Hizmet "olduğu gibi" sunulur ve belirli bir sonuç garanti edilmez. Platform, herhangi bir zamanda bildirimde bulunarak hizmeti değiştirme veya durdurma hakkını saklı tutar.</p>
          <p>Platformun kötüye kullanımı (otomatik botlar, hesap paylaşımı, içerik çalma) hesabınızın kapatılmasına neden olabilir.</p>
        </LegalModal>
      )}

      {modal === "privacy" && (
        <LegalModal title="Gizlilik Politikası" onClose={() => setModal(null)}>
          <p>Gizlilik politikamız, kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.</p>
          <p>Topladığımız veriler: ad, e-posta, telefon numarası, sınav sonuçları, kullanım alışkanlıkları.</p>
          <p>Verileriniz üçüncü taraflarla satılmaz. Yalnızca hizmetin sunulması için gerekli tedarikçilerle (bulut altyapı, e-posta gönderimi) paylaşılır.</p>
          <p>Hesabınızı istediğiniz zaman silebilirsiniz; bu durumda tüm kişisel verileriniz kalıcı olarak silinir.</p>
        </LegalModal>
      )}

      {modal === "cookie" && (
        <LegalModal title="Çerez Politikası" onClose={() => setModal(null)}>
          <p>Netor, kullanıcı deneyimini iyileştirmek için çerezler (cookies) ve benzer teknolojiler kullanır.</p>
          <p>Zorunlu çerezler: platformun temel işlevleri için gereklidir ve kapatılamaz.</p>
          <p>Analitik çerezler: kullanım alışkanlıklarını analiz etmek için kullanılır ve tarayıcı ayarlarınızdan devre dışı bırakılabilir.</p>
          <p>Pazarlama çerezleri: yalnızca pazarlama izni verdiğinizde aktif olur.</p>
        </LegalModal>
      )}
    </AuthShell>
  );
}
