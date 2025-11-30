// --- CONFIGURAÇÃO DAS APIS ---
const BASE_URL = "http://177.44.248.77";

const APIS = {
    AUTH: `${BASE_URL}/auth`,
    USUARIOS: `${BASE_URL}/usuarios`,
    EVENTOS: `${BASE_URL}/eventos`,
    PRESENCAS: `${BASE_URL}/presencas`,
    INSCRICOES: `${BASE_URL}/inscricoes`,
    CERTIFICADOS: `${BASE_URL}/certificados`,
    EMAILS: `${BASE_URL}/emails`
};

// --- UTILITÁRIOS ---
function lerIdDoToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload).id;
    } catch (e) { return null; }
}

function salvarSessao(token, email) {
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
    if (token !== 'TOKEN_OFFLINE') {
        const idReal = lerIdDoToken(token);
        if (idReal) localStorage.setItem('usuarioId', idReal);
    } else {
        if(!localStorage.getItem('usuarioId')) localStorage.setItem('usuarioId', Date.now());
    }
}

function verificarAutenticacao() { if (!localStorage.getItem('token')) window.location.href = 'index.html'; }
function logout() { localStorage.removeItem('token'); window.location.href = 'index.html'; }

// --- FUNÇÃO DE E-MAIL ---
async function enviarNotificacao(emailDestino, assunto, mensagem) {
    try {
        await fetch(APIS.EMAILS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: emailDestino, subject: assunto, body: mensagem })
        });
    } catch (erro) { console.error("Erro email:", erro); }
}

// --- CORE: BUSCA DE DADOS ---
async function carregarEventos() {
    localStorage.removeItem('cache_inscricoes');
    const statusDiv = document.getElementById('statusConexao');
    const token = localStorage.getItem('token');
    const usuarioId = localStorage.getItem('usuarioId');

    try {
        const [resEventos, resInscricoes] = await Promise.all([
            fetch(APIS.EVENTOS, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`${APIS.INSCRICOES}/usuario/${usuarioId}`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (resEventos.ok && resInscricoes.ok) {
            const eventos = await resEventos.json();
            const inscricoes = await resInscricoes.json();

            localStorage.setItem('cache_eventos', JSON.stringify(eventos));
            localStorage.setItem('cache_inscricoes', JSON.stringify(inscricoes));

            renderizarTabela(eventos, inscricoes);
            
            if(statusDiv) { statusDiv.className = "status online"; statusDiv.innerHTML = "Online 🟢 (Dados da Nuvem)"; }
            sincronizarAutomatico();
        } else { throw new Error("Erro API"); }

    } catch (err) {
        console.warn("Modo Offline.");
        const cacheEvt = localStorage.getItem('cache_eventos');
        const cacheIns = localStorage.getItem('cache_inscricoes');
        
        if (cacheEvt) {
            renderizarTabela(JSON.parse(cacheEvt), cacheIns ? JSON.parse(cacheIns) : []);
            if(statusDiv) { statusDiv.className = "status offline"; statusDiv.innerHTML = "Offline 🔴 (Cache Local)"; }
        } else {
            if(statusDiv) statusDiv.innerHTML = "Offline 🔴 (Sem dados)";
        }
    }
}

// --- RENDERIZAÇÃO ---
function renderizarTabela(eventos, minhasInscricoes) {
    const tbody = document.getElementById('listaCorpo');
    if (!tbody) return;
    tbody.innerHTML = "";
    
    // Admin check
    const emailRaw = localStorage.getItem('email');
    const emailLogado = emailRaw ? emailRaw.trim().toLowerCase() : "";
    const admins = ['admin@eventhub.com', 'staff@eventhub.com', 'josue@teste.com']; 
    const isAdmin = admins.includes(emailLogado);

    // Botão Staff Global
    const btnStaffGlobal = document.getElementById('btnStaff');
    if(btnStaffGlobal) btnStaffGlobal.style.display = isAdmin ? 'inline-block' : 'none';

    eventos.forEach(ev => {
        const inscricaoEncontrada = minhasInscricoes.find(i => ((i.eventoId === ev.id) || (i.evento && i.evento.id === ev.id)) && i.status === 'ATIVA');
        const tr = document.createElement('tr');
        let botoesHTML = "";

        if (inscricaoEncontrada) {
            botoesHTML = `<span style="color: green; font-weight: bold;">Inscrito</span>`;
        } else {
            botoesHTML = `<button class="btn-acao" onclick="inscrever(${ev.id})">Inscrever-se</button>`;
            if (isAdmin) {
                botoesHTML += ` <button style="background-color: #e83e8c; margin-left: 5px;" onclick="cadastrarECheckinVisitante(${ev.id})">⚡ Visitante</button>`;
            }
        }
        tr.innerHTML = `<td><strong>${ev.nome}</strong></td><td>${ev.descricao}</td><td>${ev.local}</td><td>${botoesHTML}</td>`;
        tbody.appendChild(tr);
    });
}

function verificarPermissaoStaff() {
    const btn = document.getElementById('btnStaff');
    if(btn) {
        const emailRaw = localStorage.getItem('email');
        const emailLogado = emailRaw ? emailRaw.trim().toLowerCase() : "";
        const admins = ['admin@eventhub.com', 'staff@eventhub.com', 'josue@teste.com'];
        if(admins.includes(emailLogado)) btn.style.display = 'inline-block';
        else btn.style.display = 'none';
    }
}

// --- MINHAS INSCRIÇÕES ---
async function carregarMinhasInscricoes() {
    // Reutiliza a lógica de busca do dashboard para garantir consistência
    // Mas aqui precisamos filtrar e mostrar botões de gestão
    localStorage.removeItem('cache_inscricoes');
    const token = localStorage.getItem('token');
    const usuarioId = localStorage.getItem('usuarioId');
    
    try {
        // Busca direta para garantir dados frescos
        const [resEventos, resInscricoes] = await Promise.all([
            fetch(APIS.EVENTOS, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`${APIS.INSCRICOES}/usuario/${usuarioId}`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (resEventos.ok && resInscricoes.ok) {
            const eventos = await resEventos.json();
            const inscricoes = await resInscricoes.json();
            renderizarMinhasInscricoes(eventos, inscricoes);
        }
    } catch (e) {
        // Fallback Cache
        const cacheEvt = JSON.parse(localStorage.getItem('cache_eventos') || '[]');
        const cacheIns = JSON.parse(localStorage.getItem('cache_inscricoes') || '[]');
        renderizarMinhasInscricoes(cacheEvt, cacheIns);
    }
}

function renderizarMinhasInscricoes(eventos, inscricoes) {
    const tbody = document.getElementById('listaMinhasInscricoes');
    if (!tbody) return;
    tbody.innerHTML = "";

    // Filtra apenas ativas
    const ativas = inscricoes.filter(i => i.status === 'ATIVA');

    if (ativas.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>Nenhuma inscrição ativa.</td></tr>";
        return;
    }

    ativas.forEach(inscricao => {
        let evento = inscricao.evento;
        if (!evento) {
            evento = eventos.find(e => e.id === inscricao.eventoId) || { nome: "Desconhecido", descricao: "-", local: "-", id: inscricao.eventoId };
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${evento.nome}</strong></td>
            <td>${evento.descricao}</td>
            <td>${evento.local}</td>
            <td>
                <button class="btn-checkin" onclick="checkin(${evento.id})">Check-in</button>
                <button class="btn-cert" onclick="certificado(${evento.id}, '${evento.nome}')">Certificado</button>
                <button class="btn-cancelar" onclick="cancelarInscricao(${inscricao.id})">Cancelar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- AÇÕES ---
async function inscrever(eventoId) {
    const usuarioId = localStorage.getItem('usuarioId');
    if(await processarAcao(APIS.INSCRICOES, { usuarioId, eventoId }, "Inscrição")) {
        const email = localStorage.getItem('email');
        enviarNotificacao(email, "Inscrição Confirmada", "Você foi inscrito no evento com sucesso!");
        window.location.reload(); 
    }
}

async function cancelarInscricao(inscricaoId) {
    if(!confirm("Cancelar inscrição?")) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${APIS.INSCRICOES}/${inscricaoId}`, {
            method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            alert("Inscrição para o evento cancelada.");
            window.location.reload(); 
        } else alert("Erro ao cancelar.");
    } catch (e) { alert("Erro de conexão (Offline)."); }
}

async function checkin(eventoId) {
    const usuarioId = localStorage.getItem('usuarioId');
    if(await processarAcao(APIS.PRESENCAS, { usuarioId, eventoId }, "Check-in")) {
        const email = localStorage.getItem('email');
        enviarNotificacao(email, "Bem-vindo!", "Check-in registrado.");
    }
}

async function certificado(eventoId, nomeEvento) {
    const usuarioId = localStorage.getItem('usuarioId');
    const token = localStorage.getItem('token');
    const nomeEventoPDF = nomeEvento || "Evento";

    try {
        const response = await fetch(APIS.CERTIFICADOS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ usuarioId, eventoId })
        });
        
        if(response.ok) {
            const data = await response.json();
            
            let nomeReal = "Participante";
            try {
                const resUser = await fetch(`${APIS.USUARIOS}/${usuarioId}`, { headers: { 'Authorization': 'Bearer ' + token } });
                if(resUser.ok) nomeReal = (await resUser.json()).nome;
            } catch(e){}

            if(confirm(`Certificado Gerado!\nBaixar PDF?`)) {
                gerarPDF(nomeReal, nomeEventoPDF, new Date().toLocaleDateString('pt-BR'), data.codigoAutenticacao);
            }
        } else {
            alert("Aviso: " + await response.text());
        }
    } catch (e) { alert("Erro ao emitir."); }
}

// --- PDF ---
function gerarPDF(nome, evento, data, codigo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setLineWidth(3); doc.rect(10, 10, 277, 190);
    doc.setFont("helvetica", "bold"); doc.setFontSize(40); doc.setTextColor(0, 51, 102);
    doc.text("CERTIFICADO", 148.5, 40, null, null, "center");
    doc.setFontSize(20); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
    doc.text("Certificamos que", 148.5, 70, null, null, "center");
    doc.setFontSize(30); doc.setFont("times", "bolditalic");
    doc.text(nome, 148.5, 90, null, null, "center");
    doc.setFontSize(20); doc.setFont("helvetica", "normal");
    doc.text("participou do evento", 148.5, 110, null, null, "center");
    doc.setFontSize(26); doc.setFont("helvetica", "bold");
    doc.text(evento, 148.5, 130, null, null, "center");
    doc.setFontSize(14); doc.setFont("helvetica", "normal");
    doc.text(`Data: ${data}`, 20, 160);
    doc.setFontSize(10);
    doc.text(`Código: ${codigo}`, 148.5, 180, null, null, "center");
    doc.text(`Valide em: http://177.44.248.77/certificados/validar/${codigo}`, 148.5, 188, null, null, "center");
    doc.save(`Certificado.pdf`);
}

// --- FLUXO VISITANTE ---
async function cadastrarECheckinVisitante(eventoId) {
    const nome = prompt("Nome:"); if (!nome) return;
    const email = prompt("E-mail:"); if (!email) return;
    const senha = "123456";
    alert("Aguarde...");
    try {
        const resCriar = await fetch(APIS.USUARIOS, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        if (!resCriar.ok && resCriar.status !== 400) throw new Error("Erro cadastro");

        const resAuth = await fetch(APIS.AUTH, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        if (!resAuth.ok) throw new Error("Erro auth");
        
        const tokenVisitante = (await resAuth.json()).token;
        const idVisitante = lerIdDoToken(tokenVisitante);

        await fetch(APIS.INSCRICOES, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenVisitante },
            body: JSON.stringify({ usuarioId: idVisitante, eventoId })
        });

        const resPresenca = await fetch(APIS.PRESENCAS, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenVisitante },
            body: JSON.stringify({ usuarioId: idVisitante, eventoId })
        });

        if (resPresenca.ok) {
            alert(`SUCESSO!\nVisitante cadastrado e check-in feito.\nSenha: 123456`);
            enviarNotificacao(email, "Acesso EventHub", `Bem-vindo ${nome}! Senha: 123456`);
        }
    } catch (e) { alert("Erro: " + e.message); }
}

async function processarAcao(url, corpo, tipo) {
    const token = localStorage.getItem('token');
    try {
        if(token === 'TOKEN_OFFLINE') throw new Error("Offline");
        const res = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(corpo)
        });
        if (res.ok) { alert(`${tipo} Sucesso!`); return true; }
        else { alert(await res.text()); return false; }
    } catch (err) {
        salvarNaFila(tipo, url, corpo);
        alert(`Sem internet. ${tipo} salvo! 💾`);
        verificarPendencias();
        return false;
    }
}

// --- SINCRONIZAÇÃO ---
function salvarNaFila(tipo, url, corpo) {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    fila.push({ tipo, url, corpo });
    localStorage.setItem('fila_sync', JSON.stringify(fila));
}

function verificarPendencias() {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    const btn = document.getElementById('btnSync');
    if(btn) {
        if(fila.length > 0) { btn.style.display = 'inline-block'; btn.innerText = `🔄 Sincronizar (${fila.length})`; }
        else { btn.style.display = 'none'; }
    }
}

async function sincronizar() {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    if(fila.length === 0) return;
    if(!confirm("Sincronizar?")) return;
    
    if(localStorage.getItem('token') === 'TOKEN_OFFLINE') { alert("Faça login online."); return; }

    const token = localStorage.getItem('token');
    const novaFila = [];
    let sucessos = 0;

    for (const item of fila) {
        try {
            const res = await fetch(item.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(item.corpo)
            });
            if(res.ok || res.status === 400 || res.status === 409) sucessos++;
            else novaFila.push(item);
        } catch (e) { novaFila.push(item); }
    }
    
    localStorage.setItem('fila_sync', JSON.stringify(novaFila));
    alert(`Sincronizados: ${sucessos}`);
    verificarPendencias();
    window.location.reload();
}

function sincronizarAutomatico() {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    if(fila.length > 0) verificarPendencias();
}

// --- FUNÇÃO PARA MANTER COMPATIBILIDADE COM HTML ANTIGO ---
function verificarPermissaoStaff() {
    // Esta função foi integrada no renderizarTabela, mas mantemos aqui vazia
    // para que o HTML não dê erro "not defined" se for uma versão antiga.
    // Ela pode ser usada para forçar a verificação se necessário.
    const btn = document.getElementById('btnStaff');
    if(btn) {
        const emailRaw = localStorage.getItem('email');
        const emailLogado = emailRaw ? emailRaw.trim().toLowerCase() : "";
        const admins = ['admin@eventhub.com', 'staff@eventhub.com', 'josue@teste.com'];
        if(admins.includes(emailLogado)) btn.style.display = 'inline-block';
        else btn.style.display = 'none';
    }
}

// Login/Cadastro Form Listeners (Mantidos iguais)...
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const msg = document.getElementById('msg');
        try {
            const response = await fetch(APIS.AUTH, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            if (response.ok) {
                const data = await response.json();
                salvarSessao(data.token, email);
                localStorage.setItem('user_offline_' + email, senha);
                window.location.href = 'dashboard.html';
            } else { msg.innerText = "Credenciais inválidas"; }
        } catch (e) {
            if(localStorage.getItem('user_offline_' + email) === senha) {
                salvarSessao('TOKEN_OFFLINE', email);
                window.location.href = 'dashboard.html';
            } else { msg.innerText = "Erro ou login inválido"; }
        }
    });
}

const cadastroForm = document.getElementById('cadastroForm');
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        try {
            const res = await fetch(APIS.USUARIOS, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha })
            });
            if (res.ok) {
                alert("Cadastro OK! Faça login.");
                localStorage.setItem('user_offline_' + email, senha);
                window.location.href = 'index.html';
            } else alert("Erro ao cadastrar.");
        } catch (err) {
            localStorage.setItem('user_offline_' + email, senha);
            alert("Salvo offline! Pode logar.");
            window.location.href = 'index.html';
        }
    });
}