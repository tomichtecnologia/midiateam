import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
    FileText, Calendar, Users, CheckSquare, Download, Loader2,
    CalendarDays, UserCheck, ClipboardList, FileDown,
    BarChart3, Clock, Shield, ImageIcon, FileType, Filter, Briefcase,
    ClipboardCheck
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

// ============ REPORT CARD ============
function ReportCard({ icon: Icon, title, description, color, badgeText, onClick }) {
    return (
        <Card
            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 hover:border-primary/30"
            onClick={onClick}
            data-testid={`report-card-${title.toLowerCase().replace(/\s/g, '-')}`}
        >
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${color} transition-transform group-hover:scale-110`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{title}</h3>
                            {badgeText && <Badge variant="secondary" className="text-xs">{badgeText}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                    </div>
                    <div className="shrink-0 mt-1">
                        <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
                            <FileDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============ DOWNLOAD HELPER ============
function savePdf(doc, filename) {
    const blob = doc.output("blob");
    saveAs(blob, filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// ============ PDF HELPERS ============
function createPdfHeader(doc, title, subtitle, entityName) {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(139, 0, 0);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 14, 28);

    if (entityName) {
        doc.setFontSize(9);
        doc.text(entityName, 14, 35);
    }

    doc.setFontSize(8);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth - 14, 35, { align: "right" });

    doc.setTextColor(0, 0, 0);
    return 48;
}

function addDescriptionBlock(doc, description, startY) {
    if (!description) return startY;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, startY - 4, pageWidth - 28, 0, 3, 3, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(description, pageWidth - 36);
    const blockHeight = lines.length * 5 + 8;

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(14, startY - 2, pageWidth - 28, blockHeight, 3, 3, "F");
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(14, startY - 2, pageWidth - 28, blockHeight, 3, 3, "S");

    doc.text(lines, 18, startY + 5);
    doc.setTextColor(0, 0, 0);
    return startY + blockHeight + 6;
}

function addPdfFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Mídia Team — Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    }
}

// ============ JPEG HELPER ============
async function generateJpeg(htmlContent, filename) {
    const container = document.createElement("div");
    container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: 800px; padding: 32px;
    background: white; font-family: 'Segoe UI', Arial, sans-serif;
    color: #222;
  `;
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
        });
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        // Convert data URL to blob
        const byteString = atob(dataUrl.split(",")[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: "image/jpeg" });
        const finalName = filename.endsWith(".jpg") ? filename : `${filename}.jpg`;
        saveAs(blob, finalName);
    } finally {
        document.body.removeChild(container);
    }
}

// ============ DEFAULT DESCRIPTIONS ============
const defaultDescriptions = {
    schedule: `Segue a escala do período. Por favor, acessem o sistema em midiateam.com.br e confirmem sua presença nas escalas. Para termos uma melhor organização, peço que confirmem o mais rápido possível. Obrigado!`,
    attendance: `Relatório de frequência dos membros nas escalas. Use este relatório para acompanhar a participação da equipe e identificar membros com baixa taxa de presença.`,
    members: `Lista completa dos membros da equipe com informações de contato. Mantenha sempre seus dados atualizados no sistema em midiateam.com.br.`,
    approvals: `Resumo das votações de conteúdo do período. Todos os membros com permissão de voto podem avaliar os conteúdos pelo sistema em midiateam.com.br.`,
    checklists: `Relatório de checklists atribuídos no período. Mostra o progresso individual de cada membro, itens concluídos e status geral.`,
};

// ============ PAGE ============
export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [entityName, setEntityName] = useState("");
    const [generating, setGenerating] = useState(false);

    const [members, setMembers] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [approvals, setApprovals] = useState([]);

    const [activeReport, setActiveReport] = useState(null);
    const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    const [reportFormat, setReportFormat] = useState("pdf");
    const [description, setDescription] = useState("");
    const [selectedScheduleTitles, setSelectedScheduleTitles] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);

    // Compute unique schedule titles for the filter
    const uniqueScheduleTitles = [...new Set(schedules.map(s => s.title).filter(Boolean))].sort();

    // Compute unique roles/functions from members
    const uniqueRoles = [...new Set(members.flatMap(m => m.roles || []).filter(Boolean))].sort();

    useEffect(() => { fetchData(); }, []);

    // When active report changes, set default description
    useEffect(() => {
        if (activeReport) {
            setDescription(defaultDescriptions[activeReport] || "");
            setReportFormat("pdf");
            // Reset filters
            setSelectedScheduleTitles([]);
            setSelectedRoles([]);
        }
    }, [activeReport]);

    const fetchData = async () => {
        try {
            const [userRes, membersRes, schedulesRes, approvalsRes] = await Promise.all([
                axios.get(`${API}/auth/me`, { withCredentials: true }),
                axios.get(`${API}/members`, { withCredentials: true }),
                axios.get(`${API}/schedules`, { withCredentials: true }),
                axios.get(`${API}/approvals`, { withCredentials: true }).catch(() => ({ data: [] })),
            ]);

            const user = userRes.data;
            const memberData = membersRes.data.find(m => m.user_id === user.user_id);
            setIsAdmin(user.is_admin || user.is_superadmin || user.role === "superadmin" || memberData?.is_admin || false);
            setEntityName(user.current_entity_name || "");
            setMembers(membersRes.data);
            setSchedules(schedulesRes.data);
            setApprovals(approvalsRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    };

    const filterByDateRange = (items, dateField) => {
        if (!dateFrom && !dateTo) return items;
        return items.filter(item => {
            const itemDate = item[dateField];
            if (!itemDate) return false;
            try {
                const d = parseISO(itemDate);
                const from = dateFrom ? parseISO(dateFrom) : new Date(2000, 0, 1);
                const to = dateTo ? parseISO(dateTo) : new Date(2100, 0, 1);
                return isWithinInterval(d, { start: from, end: to });
            } catch { return false; }
        });
    };

    const typeLabels = { class: "Aula", worship: "Culto", event: "Evento", rehearsal: "Ensaio", other: "Outro" };

    // ========================================================
    // REPORT 1: ESCALA DO PERÍODO
    // ========================================================
    const generateScheduleReport = async () => {
        let filtered = filterByDateRange(schedules, "date");
        // Apply schedule title/group filter
        if (selectedScheduleTitles.length > 0) {
            filtered = filtered.filter(s => selectedScheduleTitles.includes(s.title));
        }
        if (filtered.length === 0) { toast.error("Nenhuma escala encontrada no período selecionado"); return; }

        // Apply roles filter: only include schedules where at least one assigned member has a selected role
        if (selectedRoles.length > 0) {
            filtered = filtered.filter(s => {
                const assignedIds = s.assigned_members || [];
                return assignedIds.some(mid => {
                    // Check schedule-specific role (member_roles map)
                    const scheduleRole = (s.member_roles || {})[mid];
                    if (scheduleRole && selectedRoles.includes(scheduleRole)) return true;
                    // Check member's general roles
                    const member = members.find(m => m.member_id === mid);
                    return (member?.roles || []).some(r => selectedRoles.includes(r));
                });
            });
            if (filtered.length === 0) { toast.error("Nenhuma escala encontrada com as funções selecionadas"); return; }
        }

        const sorted = [...filtered].sort((a, b) => a.date?.localeCompare(b.date));
        const periodLabel = `${format(parseISO(dateFrom), "dd/MM/yyyy")} a ${format(parseISO(dateTo), "dd/MM/yyyy")}`;
        const safeName = `Escala_${dateFrom}_a_${dateTo}`;

        if (reportFormat === "jpeg") {
            const rows = sorted.map(s => {
                const names = (s.assigned_members || []).map(id => members.find(m => m.member_id === id)?.name || "—").join(", ");
                return `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${s.date ? format(parseISO(s.date), "dd/MM (EEE)", { locale: ptBR }) : "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${s.start_time && s.end_time ? `${s.start_time} - ${s.end_time}` : "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${typeLabels[s.schedule_type] || s.schedule_type || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${s.title || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${names || "Nenhum"}</td>
        </tr>`;
            }).join("");
            await generateJpeg(`
        <div style="background:#8B0000;color:white;padding:20px 24px;border-radius:8px 8px 0 0;margin:-32px -32px 0 -32px;">
          <h1 style="margin:0;font-size:24px;">📅 Escala do Período</h1>
          <p style="margin:4px 0 0;opacity:0.9;">${periodLabel} — ${entityName}</p>
        </div>
        <div style="margin-top:16px;padding:12px 16px;background:#f8f8f8;border:1px solid #ddd;border-radius:6px;font-size:13px;color:#555;font-style:italic;">
          ${description.replace(/\n/g, "<br>")}
        </div>
        <p style="font-size:12px;color:#666;margin:12px 0 4px;">Total de escalas: <strong>${sorted.length}</strong></p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#8B0000;color:white;">
            <th style="padding:10px 8px;text-align:left;">Data</th>
            <th style="padding:10px 8px;text-align:left;">Horário</th>
            <th style="padding:10px 8px;text-align:left;">Tipo</th>
            <th style="padding:10px 8px;text-align:left;">Título</th>
            <th style="padding:10px 8px;text-align:left;">Escalados</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:10px;color:#aaa;margin-top:16px;text-align:center;">
          Mídia Team — Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      `, safeName);
        } else {
            const doc = new jsPDF();
            let startY = createPdfHeader(doc, "Escala do Período", periodLabel, entityName);
            startY = addDescriptionBlock(doc, description, startY);

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Total de escalas: ${sorted.length}`, 14, startY);

            const tableData = sorted.map(s => {
                const names = (s.assigned_members || []).map(id => members.find(m => m.member_id === id)?.name || "—").join(", ");
                return [
                    s.date ? format(parseISO(s.date), "dd/MM (EEE)", { locale: ptBR }) : "—",
                    s.start_time && s.end_time ? `${s.start_time} - ${s.end_time}` : "—",
                    typeLabels[s.schedule_type] || s.schedule_type || "—",
                    s.title || "—",
                    names || "Nenhum",
                ];
            });

            autoTable(doc, {
                startY: startY + 6,
                head: [["Data", "Horário", "Tipo", "Título", "Escalados"]],
                body: tableData,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [139, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 2: { cellWidth: 20 }, 3: { cellWidth: 40 }, 4: { cellWidth: "auto" } },
                margin: { left: 14, right: 14 },
            });
            addPdfFooter(doc);
            savePdf(doc, `${safeName}.pdf`);
        }
        toast.success("Relatório de Escalas gerado com sucesso!");
    };

    // ========================================================
    // REPORT 2: FREQUÊNCIA / PRESENÇA
    // ========================================================
    const generateAttendanceReport = async () => {
        let filtered = filterByDateRange(schedules, "date");
        // Apply schedule title/group filter
        if (selectedScheduleTitles.length > 0) {
            filtered = filtered.filter(s => selectedScheduleTitles.includes(s.title));
        }
        if (filtered.length === 0) { toast.error("Nenhuma escala encontrada no período selecionado"); return; }

        // Apply roles filter
        if (selectedRoles.length > 0) {
            filtered = filtered.filter(s => {
                const assignedIds = s.assigned_members || [];
                return assignedIds.some(mid => {
                    const scheduleRole = (s.member_roles || {})[mid];
                    if (scheduleRole && selectedRoles.includes(scheduleRole)) return true;
                    const member = members.find(m => m.member_id === mid);
                    return (member?.roles || []).some(r => selectedRoles.includes(r));
                });
            });
            if (filtered.length === 0) { toast.error("Nenhuma escala encontrada com as funções selecionadas"); return; }
        }

        const periodLabel = `${format(parseISO(dateFrom), "dd/MM/yyyy")} a ${format(parseISO(dateTo), "dd/MM/yyyy")}`;
        const safeName = `Frequencia_${dateFrom}_a_${dateTo}`;

        const memberStats = {};
        filtered.forEach(s => {
            (s.assigned_members || []).forEach(memberId => {
                if (!memberStats[memberId]) {
                    const m = members.find(mem => mem.member_id === memberId);
                    memberStats[memberId] = { name: m?.name || "Desconhecido", roles: (m?.roles || []).join(", "), assigned: 0, confirmed: 0, absent: 0, pending: 0 };
                }
                memberStats[memberId].assigned++;
                const status = (s.attendance || {})[memberId];
                if (status === "confirmed") memberStats[memberId].confirmed++;
                else if (status === "absent") memberStats[memberId].absent++;
                else memberStats[memberId].pending++;
            });
        });
        const sorted = Object.values(memberStats).sort((a, b) => b.assigned - a.assigned);

        if (reportFormat === "jpeg") {
            const rows = sorted.map(s => {
                const rate = s.assigned > 0 ? Math.round((s.confirmed / s.assigned) * 100) : 0;
                const color = rate >= 80 ? "#16a34a" : rate >= 50 ? "#d97706" : "#dc2626";
                return `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${s.name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${s.roles || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${s.assigned}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${s.confirmed}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${s.absent}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${s.pending}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;color:${color};">${rate}%</td>
        </tr>`;
            }).join("");
            await generateJpeg(`
        <div style="background:#16a34a;color:white;padding:20px 24px;border-radius:8px 8px 0 0;margin:-32px -32px 0 -32px;">
          <h1 style="margin:0;font-size:24px;">✅ Relatório de Frequência</h1>
          <p style="margin:4px 0 0;opacity:0.9;">${periodLabel} — ${entityName}</p>
        </div>
        <div style="margin-top:16px;padding:12px 16px;background:#f8f8f8;border:1px solid #ddd;border-radius:6px;font-size:13px;color:#555;font-style:italic;">
          ${description.replace(/\n/g, "<br>")}
        </div>
        <p style="font-size:12px;color:#666;margin:12px 0 4px;">Escalas no período: <strong>${filtered.length}</strong> | Membros escalados: <strong>${sorted.length}</strong></p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#16a34a;color:white;">
            <th style="padding:10px 8px;text-align:left;">Membro</th>
            <th style="padding:10px 8px;text-align:left;">Funções</th>
            <th style="padding:10px 8px;text-align:center;">Escalado</th>
            <th style="padding:10px 8px;text-align:center;">Confirmou</th>
            <th style="padding:10px 8px;text-align:center;">Ausente</th>
            <th style="padding:10px 8px;text-align:center;">Pendente</th>
            <th style="padding:10px 8px;text-align:center;">% Presença</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:10px;color:#aaa;margin-top:16px;text-align:center;">
          Mídia Team — Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      `, safeName);
        } else {
            const doc = new jsPDF();
            let startY = createPdfHeader(doc, "Relatório de Frequência", periodLabel, entityName);
            startY = addDescriptionBlock(doc, description, startY);

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Escalas no período: ${filtered.length}  |  Membros escalados: ${sorted.length}`, 14, startY);

            const tableData = sorted.map(s => {
                const rate = s.assigned > 0 ? Math.round((s.confirmed / s.assigned) * 100) : 0;
                return [s.name, s.roles || "—", String(s.assigned), String(s.confirmed), String(s.absent), String(s.pending), `${rate}%`];
            });

            autoTable(doc, {
                startY: startY + 6,
                head: [["Membro", "Funções", "Escalado", "Confirmou", "Ausente", "Pendente", "% Presença"]],
                body: tableData,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [139, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 35 }, 6: { halign: "center", fontStyle: "bold" } },
                margin: { left: 14, right: 14 },
            });
            addPdfFooter(doc);
            savePdf(doc, `${safeName}.pdf`);
        }
        toast.success("Relatório de Frequência gerado com sucesso!");
    };

    // ========================================================
    // REPORT 3: LISTA DE MEMBROS
    // ========================================================
    const generateMembersReport = async () => {
        if (members.length === 0) { toast.error("Nenhum membro encontrado"); return; }

        const sorted = [...members].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        const safeName = `Membros_${format(new Date(), "yyyy-MM-dd")}`;

        if (reportFormat === "jpeg") {
            const rows = sorted.map(m => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${m.name || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${m.email || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${m.phone || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${(m.roles || []).join(", ") || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${m.department || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${m.is_admin ? "✅" : "—"}</td>
      </tr>`).join("");
            await generateJpeg(`
        <div style="background:#7c3aed;color:white;padding:20px 24px;border-radius:8px 8px 0 0;margin:-32px -32px 0 -32px;">
          <h1 style="margin:0;font-size:24px;">👥 Lista de Membros</h1>
          <p style="margin:4px 0 0;opacity:0.9;">Total: ${members.length} membros — ${entityName}</p>
        </div>
        <div style="margin-top:16px;padding:12px 16px;background:#f8f8f8;border:1px solid #ddd;border-radius:6px;font-size:13px;color:#555;font-style:italic;">
          ${description.replace(/\n/g, "<br>")}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
          <thead><tr style="background:#7c3aed;color:white;">
            <th style="padding:10px 8px;text-align:left;">Nome</th>
            <th style="padding:10px 8px;text-align:left;">Email</th>
            <th style="padding:10px 8px;text-align:left;">Telefone</th>
            <th style="padding:10px 8px;text-align:left;">Funções</th>
            <th style="padding:10px 8px;text-align:left;">Setor</th>
            <th style="padding:10px 8px;text-align:center;">Admin</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:10px;color:#aaa;margin-top:16px;text-align:center;">
          Mídia Team — Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      `, safeName);
        } else {
            const doc = new jsPDF();
            let startY = createPdfHeader(doc, "Lista de Membros", `Total: ${members.length} membros`, entityName);
            startY = addDescriptionBlock(doc, description, startY);

            const tableData = sorted.map(m => [
                m.name || "—", m.email || "—", m.phone || "—",
                (m.roles || []).join(", ") || "—", m.department || "—", m.is_admin ? "Sim" : "Não",
            ]);

            autoTable(doc, {
                startY: startY + 2,
                head: [["Nome", "Email", "Telefone", "Funções", "Setor", "Admin"]],
                body: tableData,
                styles: { fontSize: 7.5, cellPadding: 2.5 },
                headStyles: { fillColor: [139, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 40 }, 2: { cellWidth: 25 }, 3: { cellWidth: 35 }, 4: { cellWidth: 25 }, 5: { cellWidth: 15, halign: "center" } },
                margin: { left: 14, right: 14 },
            });
            addPdfFooter(doc);
            savePdf(doc, `${safeName}.pdf`);
        }
        toast.success("Lista de Membros gerada com sucesso!");
    };

    // ========================================================
    // REPORT 4: APROVAÇÕES
    // ========================================================
    const generateApprovalsReport = async () => {
        const filtered = filterByDateRange(approvals, "created_at");
        if (filtered.length === 0) { toast.error("Nenhuma aprovação encontrada no período"); return; }

        const periodLabel = `${format(parseISO(dateFrom), "dd/MM/yyyy")} a ${format(parseISO(dateTo), "dd/MM/yyyy")}`;
        const safeName = `Aprovacoes_${dateFrom}_a_${dateTo}`;

        const statusMap = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado", revision: "Em Revisão" };
        const approved = filtered.filter(a => a.status === "approved").length;
        const rejected = filtered.filter(a => a.status === "rejected").length;
        const pending = filtered.filter(a => a.status === "pending").length;
        const sorted = [...filtered].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

        if (reportFormat === "jpeg") {
            const rows = sorted.map(a => {
                const sub = members.find(m => m.member_id === a.submitted_by || m.user_id === a.submitted_by);
                const statusColor = a.status === "approved" ? "#16a34a" : a.status === "rejected" ? "#dc2626" : "#d97706";
                return `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${a.created_at ? format(parseISO(a.created_at), "dd/MM/yyyy") : "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${a.title || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${a.content_type || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${sub?.name || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;color:${statusColor};font-weight:bold;">${statusMap[a.status] || a.status}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${(a.votes_for?.length || 0)}/${(a.votes_against?.length || 0)}</td>
        </tr>`;
            }).join("");
            await generateJpeg(`
        <div style="background:#d97706;color:white;padding:20px 24px;border-radius:8px 8px 0 0;margin:-32px -32px 0 -32px;">
          <h1 style="margin:0;font-size:24px;">📋 Relatório de Aprovações</h1>
          <p style="margin:4px 0 0;opacity:0.9;">${periodLabel} — ${entityName}</p>
        </div>
        <div style="margin-top:16px;padding:12px 16px;background:#f8f8f8;border:1px solid #ddd;border-radius:6px;font-size:13px;color:#555;font-style:italic;">
          ${description.replace(/\n/g, "<br>")}
        </div>
        <p style="font-size:12px;color:#666;margin:12px 0 4px;">
          Total: <strong>${filtered.length}</strong> | Aprovados: <strong style="color:#16a34a;">${approved}</strong> | Rejeitados: <strong style="color:#dc2626;">${rejected}</strong> | Pendentes: <strong style="color:#d97706;">${pending}</strong>
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#d97706;color:white;">
            <th style="padding:10px 8px;text-align:left;">Data</th>
            <th style="padding:10px 8px;text-align:left;">Título</th>
            <th style="padding:10px 8px;text-align:left;">Tipo</th>
            <th style="padding:10px 8px;text-align:left;">Enviado por</th>
            <th style="padding:10px 8px;text-align:left;">Status</th>
            <th style="padding:10px 8px;text-align:center;">Votos (✓/✗)</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:10px;color:#aaa;margin-top:16px;text-align:center;">
          Mídia Team — Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      `, safeName);
        } else {
            const doc = new jsPDF();
            let startY = createPdfHeader(doc, "Relatório de Aprovações", periodLabel, entityName);
            startY = addDescriptionBlock(doc, description, startY);

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Total: ${filtered.length}  |  Aprovados: ${approved}  |  Rejeitados: ${rejected}  |  Pendentes: ${pending}`, 14, startY);

            const tableData = sorted.map(a => {
                const sub = members.find(m => m.member_id === a.submitted_by || m.user_id === a.submitted_by);
                return [
                    a.created_at ? format(parseISO(a.created_at), "dd/MM/yyyy") : "—",
                    a.title || "—", a.content_type || "—", sub?.name || "—",
                    statusMap[a.status] || a.status || "—",
                    `${(a.votes_for?.length || 0)}/${(a.votes_against?.length || 0)}`,
                ];
            });

            autoTable(doc, {
                startY: startY + 6,
                head: [["Data", "Título", "Tipo", "Enviado por", "Status", "Votos (✓/✗)"]],
                body: tableData,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [139, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: { 0: { cellWidth: 22 }, 5: { cellWidth: 20, halign: "center" } },
                margin: { left: 14, right: 14 },
            });
            addPdfFooter(doc);
            savePdf(doc, `${safeName}.pdf`);
        }
        toast.success("Relatório de Aprovações gerado com sucesso!");
    };

    // ========================================================
    // REPORT 5: CHECKLISTS
    // ========================================================
    const generateChecklistsReport = async () => {
        try {
            const res = await axios.get(`${API}/reports/checklists`, {
                params: { date_from: dateFrom, date_to: dateTo },
                withCredentials: true
            });
            const data = res.data;
            if (data.assignments.length === 0) { toast.error("Nenhum checklist encontrado no período"); return; }

            const periodLabel = `${format(parseISO(dateFrom), "dd/MM/yyyy")} a ${format(parseISO(dateTo), "dd/MM/yyyy")}`;
            const safeName = `Checklists_${dateFrom}_a_${dateTo}`;

            const statusLabels = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluído" };

            if (reportFormat === "jpeg") {
                const memberRows = data.member_stats.map(s => {
                    const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                    const color = rate >= 80 ? "#16a34a" : rate >= 50 ? "#d97706" : "#dc2626";
                    return `<tr>
                        <td style="padding:8px;border-bottom:1px solid #eee;">${s.name}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${s.total}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${s.completed}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${s.pending + s.in_progress}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${s.done_items}/${s.total_items}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;color:${color};">${rate}%</td>
                    </tr>`;
                }).join("");
                await generateJpeg(`
                    <div style="background:#0d9488;color:white;padding:20px 24px;border-radius:8px 8px 0 0;margin:-32px -32px 0 -32px;">
                        <h1 style="margin:0;font-size:24px;">\u2705 Relat\u00f3rio de Checklists</h1>
                        <p style="margin:4px 0 0;opacity:0.9;">${periodLabel} \u2014 ${entityName}</p>
                    </div>
                    <div style="margin-top:16px;padding:12px 16px;background:#f8f8f8;border:1px solid #ddd;border-radius:6px;font-size:13px;color:#555;font-style:italic;">
                        ${description.replace(/\n/g, "<br>")}
                    </div>
                    <p style="font-size:12px;color:#666;margin:12px 0 4px;">
                        Total: <strong>${data.summary.total}</strong> | Conclu\u00eddos: <strong style="color:#16a34a;">${data.summary.completed}</strong> | Pendentes: <strong style="color:#d97706;">${data.summary.pending + data.summary.in_progress}</strong>
                    </p>
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead><tr style="background:#0d9488;color:white;">
                            <th style="padding:10px 8px;text-align:left;">Membro</th>
                            <th style="padding:10px 8px;text-align:center;">Total</th>
                            <th style="padding:10px 8px;text-align:center;">Conclu\u00eddos</th>
                            <th style="padding:10px 8px;text-align:center;">Pendentes</th>
                            <th style="padding:10px 8px;text-align:center;">Itens</th>
                            <th style="padding:10px 8px;text-align:center;">% Conclus\u00e3o</th>
                        </tr></thead>
                        <tbody>${memberRows}</tbody>
                    </table>
                    <p style="font-size:10px;color:#aaa;margin-top:16px;text-align:center;">
                        M\u00eddia Team \u2014 Gerado em ${format(new Date(), "dd/MM/yyyy '\u00e0s' HH:mm", { locale: ptBR })}
                    </p>
                `, safeName);
            } else {
                const doc = new jsPDF();
                let startY = createPdfHeader(doc, "Relat\u00f3rio de Checklists", periodLabel, entityName);
                startY = addDescriptionBlock(doc, description, startY);

                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(`Total: ${data.summary.total}  |  Conclu\u00eddos: ${data.summary.completed}  |  Pendentes: ${data.summary.pending + data.summary.in_progress}`, 14, startY);

                const memberTableData = data.member_stats.map(s => {
                    const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                    return [s.name, String(s.total), String(s.completed), String(s.pending + s.in_progress), `${s.done_items}/${s.total_items}`, `${rate}%`];
                });

                autoTable(doc, {
                    startY: startY + 6,
                    head: [["Membro", "Total", "Conclu\u00eddos", "Pendentes", "Itens", "% Conclus\u00e3o"]],
                    body: memberTableData,
                    styles: { fontSize: 8, cellPadding: 3 },
                    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold" },
                    alternateRowStyles: { fillColor: [245, 245, 245] },
                    columnStyles: { 0: { cellWidth: 45 }, 5: { halign: "center", fontStyle: "bold" } },
                    margin: { left: 14, right: 14 },
                });

                // Add detail table
                const detailY = doc.lastAutoTable.finalY + 12;
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text("Detalhamento por Checklist", 14, detailY);

                const detailData = data.assignments.map(a => {
                    const doneCount = a.items?.filter(i => i.done).length || 0;
                    const totalCount = a.items?.length || 0;
                    return [
                        a.due_date ? format(parseISO(a.due_date), "dd/MM") : "\u2014",
                        a.checklist_title || "\u2014",
                        a.assigned_to_name || "\u2014",
                        a.schedule_title || "\u2014",
                        `${doneCount}/${totalCount}`,
                        statusLabels[a.status] || a.status,
                    ];
                });

                autoTable(doc, {
                    startY: detailY + 4,
                    head: [["Data", "Checklist", "Respons\u00e1vel", "Escala", "Itens", "Status"]],
                    body: detailData,
                    styles: { fontSize: 7.5, cellPadding: 2.5 },
                    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold" },
                    alternateRowStyles: { fillColor: [245, 245, 245] },
                    margin: { left: 14, right: 14 },
                });

                addPdfFooter(doc);
                savePdf(doc, `${safeName}.pdf`);
            }
            toast.success("Relat\u00f3rio de Checklists gerado com sucesso!");
        } catch (error) {
            console.error("Error generating checklists report:", error);
            toast.error("Erro ao gerar relat\u00f3rio de checklists");
        }
    };

    // ===== GENERATE =====
    const handleGenerate = async () => {
        setGenerating(true);
        try {
            switch (activeReport) {
                case "schedule": await generateScheduleReport(); break;
                case "attendance": await generateAttendanceReport(); break;
                case "members": await generateMembersReport(); break;
                case "approvals": await generateApprovalsReport(); break;
                case "checklists": await generateChecklistsReport(); break;
                default: break;
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao gerar relatório");
        } finally {
            setGenerating(false);
            setActiveReport(null);
        }
    };

    const reportConfigs = {
        schedule: { title: "Escala do Período", needsDates: true },
        attendance: { title: "Relatório de Frequência", needsDates: true },
        members: { title: "Lista de Membros", needsDates: false },
        approvals: { title: "Relatório de Aprovações", needsDates: true },
        checklists: { title: "Relatório de Checklists", needsDates: true },
    };

    if (loading) {
        return (
            <div className="space-y-6" data-testid="reports-loading">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-32" /><Skeleton className="h-32" />
                    <Skeleton className="h-32" /><Skeleton className="h-32" />
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                <p className="text-muted-foreground">Apenas administradores podem gerar relatórios.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn" data-testid="reports-page">
            <div>
                <h1 className="font-outfit text-3xl font-bold text-foreground">Relatórios</h1>
                <p className="text-muted-foreground mt-1">Gere relatórios em PDF ou imagem para compartilhar com sua equipe</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950 dark:to-blue-900/50 border-blue-200/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <CalendarDays className="w-8 h-8 text-blue-600" />
                        <div><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{schedules.length}</p><p className="text-xs text-blue-600/70">Escalas</p></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900/50 border-green-200/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Users className="w-8 h-8 text-green-600" />
                        <div><p className="text-2xl font-bold text-green-700 dark:text-green-300">{members.length}</p><p className="text-xs text-green-600/70">Membros</p></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950 dark:to-purple-900/50 border-purple-200/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <CheckSquare className="w-8 h-8 text-purple-600" />
                        <div><p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{approvals.length}</p><p className="text-xs text-purple-600/70">Aprovações</p></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950 dark:to-amber-900/50 border-amber-200/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-amber-600" />
                        <div><p className="text-2xl font-bold text-amber-700 dark:text-amber-300">PDF/JPG</p><p className="text-xs text-amber-600/70">Formatos</p></div>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReportCard icon={CalendarDays} title="Escala do Período" description="Gere um PDF ou imagem com todas as escalas. Ideal para compartilhar no WhatsApp ou Telegram." color="bg-blue-600" badgeText="Mais usado" onClick={() => setActiveReport("schedule")} />
                <ReportCard icon={UserCheck} title="Frequência / Presença" description="Relatório de presença de cada membro nas escalas. Mostra taxas de confirmação e ausências." color="bg-green-600" onClick={() => setActiveReport("attendance")} />
                <ReportCard icon={Users} title="Lista de Membros" description="Diretório completo com nome, email, telefone, funções e setor." color="bg-purple-600" onClick={() => setActiveReport("members")} />
                <ReportCard icon={ClipboardList} title="Aprovações de Conteúdo" description="Resumo das votações com status e votos. Ideal para prestar contas." color="bg-amber-600" onClick={() => setActiveReport("approvals")} />
                <ReportCard icon={ClipboardCheck} title="Checklists" description="Relatório de checklists com progresso individual. Ideal para acompanhar tarefas operacionais." color="bg-teal-600" badgeText="Novo" onClick={() => setActiveReport("checklists")} />
            </div>

            {/* Generate Dialog */}
            <Dialog open={!!activeReport} onOpenChange={(open) => !open && setActiveReport(null)}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-outfit flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            {activeReport && reportConfigs[activeReport]?.title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Date filters */}
                        {activeReport && reportConfigs[activeReport]?.needsDates && (
                            <>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Período</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><Label className="text-xs text-muted-foreground">De</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
                                        <div><Label className="text-xs text-muted-foreground">Até</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm" onClick={() => { const n = new Date(); setDateFrom(format(startOfMonth(n), "yyyy-MM-dd")); setDateTo(format(endOfMonth(n), "yyyy-MM-dd")); }}><Clock className="w-3 h-3 mr-1" /> Este mês</Button>
                                    <Button variant="outline" size="sm" onClick={() => { const n = new Date(); const l = new Date(n.getFullYear(), n.getMonth() - 1, 1); setDateFrom(format(startOfMonth(l), "yyyy-MM-dd")); setDateTo(format(endOfMonth(l), "yyyy-MM-dd")); }}>Mês anterior</Button>
                                    <Button variant="outline" size="sm" onClick={() => { const n = new Date(); const x = new Date(n.getFullYear(), n.getMonth() + 1, 1); setDateFrom(format(startOfMonth(x), "yyyy-MM-dd")); setDateTo(format(endOfMonth(x), "yyyy-MM-dd")); }}>Próximo mês</Button>
                                </div>
                            </>
                        )}

                        {/* Schedule group filter */}
                        {(activeReport === "schedule" || activeReport === "attendance") && uniqueScheduleTitles.length > 1 && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1"><Filter className="w-4 h-4" /> Grupo de Escala</Label>
                                <p className="text-xs text-muted-foreground">Selecione quais escalas incluir no relatório. Deixe vazio para incluir todas.</p>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-lg border bg-muted/30">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (selectedScheduleTitles.length === uniqueScheduleTitles.length) {
                                                setSelectedScheduleTitles([]);
                                            } else {
                                                setSelectedScheduleTitles([...uniqueScheduleTitles]);
                                            }
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedScheduleTitles.length === 0
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-background border-muted-foreground/30 hover:border-primary/50"
                                            }`}
                                    >
                                        Todas
                                    </button>
                                    {uniqueScheduleTitles.map(title => {
                                        const isSelected = selectedScheduleTitles.includes(title);
                                        return (
                                            <button
                                                key={title}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedScheduleTitles(selectedScheduleTitles.filter(t => t !== title));
                                                    } else {
                                                        setSelectedScheduleTitles([...selectedScheduleTitles, title]);
                                                    }
                                                }}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${isSelected
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                    : "bg-background border-muted-foreground/30 hover:border-blue-400"
                                                    }`}
                                            >
                                                {title}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedScheduleTitles.length > 0 && (
                                    <p className="text-xs text-blue-600 font-medium">
                                        {selectedScheduleTitles.length} de {uniqueScheduleTitles.length} grupos selecionados
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Roles / Functions filter */}
                        {(activeReport === "schedule" || activeReport === "attendance") && uniqueRoles.length > 0 && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> Funções / Cargos</Label>
                                <p className="text-xs text-muted-foreground">Filtre por função dos membros escalados. Deixe vazio para incluir todas.</p>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-lg border bg-muted/30">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (selectedRoles.length === uniqueRoles.length) {
                                                setSelectedRoles([]);
                                            } else {
                                                setSelectedRoles([...uniqueRoles]);
                                            }
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedRoles.length === 0
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-background border-muted-foreground/30 hover:border-primary/50"
                                            }`}
                                    >
                                        Todas
                                    </button>
                                    {uniqueRoles.map(role => {
                                        const isSelected = selectedRoles.includes(role);
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedRoles(selectedRoles.filter(r => r !== role));
                                                    } else {
                                                        setSelectedRoles([...selectedRoles, role]);
                                                    }
                                                }}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${isSelected
                                                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                                                    : "bg-background border-muted-foreground/30 hover:border-purple-400"
                                                    }`}
                                            >
                                                {role}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedRoles.length > 0 && (
                                    <p className="text-xs text-purple-600 font-medium">
                                        {selectedRoles.length} de {uniqueRoles.length} funções selecionadas
                                    </p>
                                )}
                            </div>
                        )}

                        {activeReport === "members" && (
                            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                                <p className="flex items-center gap-2"><Users className="w-4 h-4" /> Será gerado com todos os <strong>{members.length} membros</strong> da organização.</p>
                            </div>
                        )}

                        {/* Description */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1"><FileText className="w-4 h-4" /> Mensagem / Descrição</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Adicione uma mensagem que aparecerá no relatório..."
                                rows={3}
                                className="text-sm"
                            />
                            <p className="text-xs text-muted-foreground">Esta mensagem aparecerá no topo do relatório, abaixo do cabeçalho.</p>
                        </div>

                        {/* Format selector */}
                        <div className="space-y-2">
                            <Label>Formato</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setReportFormat("pdf")}
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${reportFormat === "pdf"
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                >
                                    <FileType className={`w-5 h-5 ${reportFormat === "pdf" ? "text-primary" : "text-muted-foreground"}`} />
                                    <div className="text-left">
                                        <p className="font-medium text-sm">PDF</p>
                                        <p className="text-xs text-muted-foreground">Documento completo</p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReportFormat("jpeg")}
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${reportFormat === "jpeg"
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                >
                                    <ImageIcon className={`w-5 h-5 ${reportFormat === "jpeg" ? "text-primary" : "text-muted-foreground"}`} />
                                    <div className="text-left">
                                        <p className="font-medium text-sm">Imagem (JPG)</p>
                                        <p className="text-xs text-muted-foreground">Ideal p/ WhatsApp</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleGenerate} disabled={generating}>
                            {generating
                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                                : <><Download className="w-4 h-4 mr-2" /> Gerar {reportFormat === "jpeg" ? "Imagem" : "PDF"}</>
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
