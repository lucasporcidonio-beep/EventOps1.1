import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { getApiUrl } from "@/lib/api";
import { Lock } from "lucide-react";

const Login = () => {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const API = getApiUrl();
            // Test the password explicitly against the new verify endpoint
            const response = await fetch(`${API}/auth/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${password}`,
                    "ngrok-skip-browser-warning": "true"
                }
            });

            if (response.ok) {
                localStorage.setItem("app_token", password);
                toast({
                    title: "Acesso Liberado",
                    description: "Bem-vindo(a) de volta ao EventFlow.",
                });
                navigate("/");
            } else {
                toast({
                    title: "Acesso Negado",
                    description: "A Senha Mestra está incorreta.",
                    variant: "destructive"
                });
            }
        } catch (err) {
            toast({
                title: "Erro de Conexão",
                description: "Não foi possível conectar ao servidor. Verifique o link e a internet.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md bg-zinc-950/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 mx-auto">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
                        <Lock className="w-10 h-10 text-black" />
                    </div>
                    <h1 className="text-3xl font-semibold text-white tracking-tight">Cofre EventFlow</h1>
                    <p className="text-zinc-400 text-sm mt-3 text-center px-4 leading-relaxed">
                        Sistema blindado. Para acessar a nuvem e a carteira de clientes, digite a sua Senha Mestra.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="*************"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-black/50 border-white/10 text-emerald-400 placeholder:text-zinc-600 h-14 text-center text-xl tracking-[0.3em] focus-visible:ring-emerald-500/30 rounded-xl"
                            autoFocus
                        />
                    </div>
                    <Button 
                        type="submit" 
                        disabled={loading || !password}
                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] rounded-xl text-lg mt-4 disabled:opacity-50"
                    >
                        {loading ? "Descriptografando..." : "DESTRAVAR CRM"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default Login;
