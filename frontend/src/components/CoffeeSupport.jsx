import React, { useState } from "react";
import { Coffee, Copy, Check, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CoffeeSupport() {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const pixKey = "danilo@tomich.com.br";

    const handleCopyPix = () => {
        navigator.clipboard.writeText(pixKey);
        setCopied(true);
        toast.success("Chave PIX copiada!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            {/* Floating Button */}
            <div className="fixed bottom-6 right-6 z-[100] animate-fadeIn">
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-2xl bg-amber-500 hover:bg-amber-600 border-4 border-white dark:border-zinc-900 group transition-all duration-300 hover:scale-110 active:scale-95"
                    data-testid="coffee-toggle-btn"
                >
                    <Coffee className="w-6 h-6 text-white group-hover:animate-bounce" />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 items-center justify-center border-2 border-white">
                            <Heart className="w-2.5 h-2.5 text-white fill-white" />
                        </span>
                    </span>
                </Button>
            </div>

            {/* Support Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[400px] bg-zinc-900 text-zinc-100 border-zinc-800 shadow-2xl p-0 overflow-hidden">
                    <div className="relative p-6 pt-10">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-amber-500/20 to-transparent"></div>

                        <DialogHeader className="relative z-10 text-center space-y-3">
                            <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30">
                                <Coffee className="w-8 h-8 text-amber-500" />
                            </div>
                            <DialogTitle className="font-outfit text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                                Apoie o Desenvolvedor
                            </DialogTitle>
                            <DialogDescription className="text-zinc-400 text-base leading-relaxed">
                                "O que está sendo instruído na palavra partilhe todas as coisas boas com aquele que o instrui."
                                <div className="mt-2 font-semibold text-amber-500/80 italic">— Gálatas 6:6</div>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-8 space-y-4 relative z-10">
                            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Chave PIX</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-zinc-900 px-3 py-2.5 rounded-lg font-mono text-sm text-amber-500 border border-zinc-800 break-all">
                                        {pixKey}
                                    </div>
                                    <Button
                                        size="icon"
                                        onClick={handleCopyPix}
                                        className={`shrink-0 h-10 w-10 transition-all duration-300 ${copied ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                                            }`}
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center gap-2 text-xs text-zinc-500 justify-center">
                                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                                <span>Muito obrigado pela sua generosidade!</span>
                            </div>
                        </div>

                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -z-10 rounded-full"></div>
                    </div>

                    <div className="bg-zinc-800/50 p-4 text-center">
                        <Button
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            className="text-zinc-400 hover:text-white hover:bg-white/5 w-full"
                        >
                            Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
