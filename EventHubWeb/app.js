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

// --- CORE: BUSCA DE DADOS (AGORA COM PRESENÇAS) ---
async function buscarDadosComCache() {
    const token = localStorage.getItem('token');
    const usuarioId = localStorage.getItem('usuarioId');
    const statusDiv = document.getElementById('statusConexao');

    try {
        // CORREÇÃO: Busca Eventos, Inscrições E PRESENÇAS
        const [resEventos, resInscricoes, resPresencas] = await Promise.all([
            fetch(APIS.EVENTOS, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`${APIS.INSCRICOES}/usuario/${usuarioId}`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(APIS.PRESENCAS, { headers: { 'Authorization': 'Bearer ' + token } }) // Busca todas para filtrar
        ]);

        if (resEventos.ok && resInscricoes.ok && resPresencas.ok) {
            const eventos = await resEventos.json();
            const inscricoes = await resInscricoes.json();
            const todasPresencas = await resPresencas.json();
            
            // Filtra apenas as minhas
            const minhasPresencas = todasPresencas.filter(p => p.usuarioId == usuarioId);

            localStorage.setItem('cache_eventos', JSON.stringify(eventos));
            localStorage.setItem('cache_inscricoes', JSON.stringify(inscricoes));
            localStorage.setItem('cache_presencas', JSON.stringify(minhasPresencas));

            if(statusDiv) { statusDiv.className = "status online"; statusDiv.innerHTML = "Online 🟢 (Dados da Nuvem)"; }
            sincronizarAutomatico();
            
            return { eventos, inscricoes, presencas: minhasPresencas, online: true };
        } else { throw new Error("Erro API"); }

    } catch (err) {
        console.warn("Modo Offline.");
        const cacheEvt = localStorage.getItem('cache_eventos');
        const cacheIns = localStorage.getItem('cache_inscricoes');
        const cachePres = localStorage.getItem('cache_presencas');
        
        if (cacheEvt) {
            if(statusDiv) { statusDiv.className = "status offline"; statusDiv.innerHTML = "Offline 🔴 (Cache Local)"; }
            return { 
                eventos: JSON.parse(cacheEvt || '[]'),
                inscricoes: JSON.parse(cacheIns || '[]'),
                presencas: JSON.parse(cachePres || '[]'),
                online: false 
            };
        } else {
            if(statusDiv) statusDiv.innerHTML = "Offline 🔴 (Sem dados)";
            return null;
        }
    }
}

// --- RENDERIZAÇÃO DASHBOARD ---
async function carregarDashboard() {
    const dados = await buscarDadosComCache();
    if(!dados) return;

    const tbody = document.getElementById('listaCorpo');
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const emailRaw = localStorage.getItem('email');
    const emailLogado = emailRaw ? emailRaw.trim().toLowerCase() : "";
    const admins = ['admin@eventhub.com', 'staff@eventhub.com', 'josue@teste.com']; 
    const isAdmin = admins.includes(emailLogado);

    const btnStaffGlobal = document.getElementById('btnStaff');
    if(btnStaffGlobal) btnStaffGlobal.style.display = isAdmin ? 'inline-block' : 'none';

    dados.eventos.forEach(ev => {
        const inscricaoEncontrada = dados.inscricoes.find(i => ((i.eventoId === ev.id) || (i.evento && i.evento.id === ev.id)) && i.status === 'ATIVA');
        const tr = document.createElement('tr');
        let botoesHTML = "";
        const checkinEncontrado = dados.presencas.find(p => p.eventoId === ev.id);

        if (inscricaoEncontrada) {
            botoesHTML = `<span style="color: green; font-weight: bold;">Inscrito </span>`;
            if(checkinEncontrado) {
                botoesHTML += `<span style="color: green; font-weight: bold;">e Check-in realizado!</span>`
            } else {
                botoesHTML += ` <button class="btn-checkin" onclick="checkin(${ev.id})">Check-in</button>`;
            }
        } else {
            botoesHTML = `<button class="btn-acao" onclick="inscrever(${ev.id})">Inscrever-se</button>`;
            if (isAdmin) {
                botoesHTML += ` <button style="background-color: #e83e8c; margin-left: 5px;" onclick="cadastrarECheckinVisitante(${ev.id})">Visitante</button>`;
            }
        }
        tr.innerHTML = `<td><strong>${ev.nome}</strong></td><td>${ev.descricao}</td><td>${ev.local}</td><td>${botoesHTML}</td>`;
        tbody.appendChild(tr);
    });
}

// --- TELA 2: MINHAS INSCRIÇÕES (Com Validação de Certificado) ---
async function carregarMinhasInscricoes() {
    const dados = await buscarDadosComCache();
    const tbody = document.getElementById('listaMinhasInscricoes');
    if (!tbody || !dados) return;
    tbody.innerHTML = "";

    const inscricoesAtivas = dados.inscricoes.filter(i => i.status === 'ATIVA');

    if (inscricoesAtivas.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>Nenhuma inscrição ativa.</td></tr>";
        return;
    }

    inscricoesAtivas.forEach(inscricao => {
        let evento = inscricao.evento;
        if (!evento) {
            evento = dados.eventos.find(e => e.id === inscricao.eventoId) || { nome: "Evento", descricao: "-", local: "-", id: inscricao.eventoId };
        }

        // VERIFICAÇÃO DE PRESENÇA
        const temPresenca = dados.presencas && dados.presencas.some(p => p.eventoId === evento.id);
        
        let btnCertificado = "";
        if (temPresenca) {
            // Ativo
            btnCertificado = `<button class="btn-cert" onclick="certificado(${evento.id}, '${evento.nome}')">Certificado</button>`;
        } else {
            // Bloqueado (Cinza)
            btnCertificado = `<button class="btn-cert" style="background-color: #ccc; cursor: not-allowed;" onclick="alert('Realize o Check-in primeiro!')">Certificado</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${evento.nome}</strong></td>
            <td>${evento.descricao}</td>
            <td>${evento.local}</td>
            <td>
                <button class="btn-checkin" onclick="checkin(${evento.id})">Check-in</button>
                ${btnCertificado}
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
            alert("Cancelado.");
            window.location.reload(); 
        } else alert("Erro ao cancelar.");
    } catch (e) { alert("Erro de conexão (Offline)."); }
}

async function checkin(eventoId) {
    const usuarioId = localStorage.getItem('usuarioId');
    if(await processarAcao(APIS.PRESENCAS, { usuarioId, eventoId }, "Check-in")) {
        const email = localStorage.getItem('email');
        enviarNotificacao(email, "Bem-vindo!", "Check-in registrado.");
        window.location.reload();
    }
}

async function certificado(eventoId, nomeEvento) {
    const usuarioId = localStorage.getItem('usuarioId');
    const token = localStorage.getItem('token');
    const nomeEventoPDF = nomeEvento || "Evento Acadêmico"; 

    try {
        // 1. BUSCA O NOME REAL DO USUÁRIO (ANTES DE EMITIR!)
        // Precisamos do nome para enviar ao Backend e gravar no certificado
        let nomeReal = "Participante";
        try {
            const resUser = await fetch(`${APIS.USUARIOS}/${usuarioId}`, { 
                headers: { 'Authorization': 'Bearer ' + token } 
            });
            if (resUser.ok) {
                const dadosUser = await resUser.json();
                nomeReal = dadosUser.nome; 
            }
        } catch (err) { console.error("Erro ao buscar nome", err); }

        // 2. EMITE O CERTIFICADO (Enviando os nomes junto!)
        const response = await fetch(APIS.CERTIFICADOS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ 
                usuarioId: usuarioId, 
                eventoId: eventoId,
                // NOVOS CAMPOS PARA O BACKEND GUARDAR:
                nomeUsuario: nomeReal,
                nomeEvento: nomeEventoPDF
            })
        });
        
        if(response.ok) {
            const data = await response.json();
            const codigo = data.codigoAutenticacao;
            const dataEmissao = new Date().toLocaleDateString('pt-BR');

            if(confirm(`Certificado Gerado!\nCódigo: ${codigo}\n\nDeseja baixar o PDF agora?`)) {
                gerarPDF(nomeReal, nomeEventoPDF, dataEmissao, codigo);
            }
        } else {
            const erro = await response.text();
            alert("Aviso: " + erro); 
        }
    } catch (e) {
        alert("Erro ao emitir certificado. Verifique sua conexão.");
    }
}

function gerarPDF(nome, evento, data, codigo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const linkValidacao = `Valide em: http://177.44.248.77/validar.html?codigo=${codigo}`;
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
    doc.text(linkValidacao, 148.5, 188, null, null, "center");
    doc.save(`Certificado.pdf`);
}

// --- FLUXO VISITANTE ---
async function cadastrarECheckinVisitante(eventoId) {
    const nome = prompt("Nome:"); if (!nome) return;
    const email = prompt("E-mail:"); if (!email) return;
    const senha = "123456";
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
        alert(`Sem internet. ${tipo} salvo! Será sincronizado depois.`);
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