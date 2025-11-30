// --- CONFIGURAÇÃO DAS APIS ---
// Aponta para a VM (Nginx Proxy reverso cuida das portas)
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

// --- UTILITÁRIOS DE TOKEN E SESSÃO ---
function lerIdDoToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
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
        // Se for offline e não tiver ID, gera um temporário
        if(!localStorage.getItem('usuarioId')) localStorage.setItem('usuarioId', Date.now());
    }
}

function verificarAutenticacao() {
    if (!localStorage.getItem('token')) window.location.href = 'index.html';
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// --- FUNÇÃO DE E-MAIL (Notificações) ---
async function enviarNotificacao(emailDestino, assunto, mensagem) {
    try {
        await fetch(APIS.EMAILS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: emailDestino, subject: assunto, body: mensagem })
        });
    } catch (erro) { console.error("Erro ao enviar email (provavelmente offline):", erro); }
}

// --- CORE: BUSCA DE DADOS (COM CACHE) ---
async function buscarDadosComCache() {
    const token = localStorage.getItem('token');
    const usuarioId = localStorage.getItem('usuarioId');
    const statusDiv = document.getElementById('statusConexao');

    try {
        // Busca Eventos e Inscrições em paralelo para ser mais rápido
        const [resEventos, resInscricoes] = await Promise.all([
            fetch(APIS.EVENTOS, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`${APIS.INSCRICOES}/usuario/${usuarioId}`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (resEventos.ok && resInscricoes.ok) {
            const eventos = await resEventos.json();
            const inscricoes = await resInscricoes.json();

            // Atualiza Cache
            localStorage.setItem('cache_eventos', JSON.stringify(eventos));
            localStorage.setItem('cache_inscricoes', JSON.stringify(inscricoes));

            if(statusDiv) { statusDiv.className = "status online"; statusDiv.innerHTML = "Online 🟢 (Dados da Nuvem)"; }
            
            // Se a net voltou, tenta sincronizar pendências
            sincronizarAutomatico();
            
            return { eventos, inscricoes, online: true };
        } else { throw new Error("Erro API"); }

    } catch (err) {
        console.warn("Modo Offline ativado.");
        if(statusDiv) { statusDiv.className = "status offline"; statusDiv.innerHTML = "Offline 🔴 (Cache Local)"; }
        
        return { 
            eventos: JSON.parse(localStorage.getItem('cache_eventos') || '[]'),
            inscricoes: JSON.parse(localStorage.getItem('cache_inscricoes') || '[]'),
            online: false 
        };
    }
}

// --- TELA 1: DASHBOARD (Catálogo Geral) ---
async function carregarDashboard() {
    const dados = await buscarDadosComCache();
    const tbody = document.getElementById('listaCorpo');
    if (!tbody) return; // Proteção caso esteja noutra página
    tbody.innerHTML = "";
    
    // --- LÓGICA DE ADMIN (CORRIGIDA) ---
    const emailRaw = localStorage.getItem('email');
    const emailLogado = emailRaw ? emailRaw.trim().toLowerCase() : "";
    const admins = ['admin@eventhub.com', 'staff@eventhub.com', 'josue@teste.com']; 
    const isAdmin = admins.includes(emailLogado);

    // Mostra/Esconde botão global de Staff se existir
    const btnStaffGlobal = document.getElementById('btnStaff');
    if(btnStaffGlobal) btnStaffGlobal.style.display = isAdmin ? 'inline-block' : 'none';

    dados.eventos.forEach(ev => {
        // Verifica se já está inscrito
        const estaInscrito = dados.inscricoes.some(i => ((i.eventoId === ev.id) || (i.evento && i.evento.id === ev.id)) && i.status === 'ATIVA');
        const tr = document.createElement('tr');
        
        let acaoHTML = "";
        if (estaInscrito) {
            acaoHTML = `<span style="color: green; font-weight: bold;">Inscrito</span>`;
        } else {
            acaoHTML = `<button class="btn-acao" onclick="inscrever(${ev.id})">Inscrever-se</button>`;
            
            // Botão STAFF (Só aparece se for admin e não estiver inscrito ainda)
            if (isAdmin) {
                acaoHTML += ` <button style="background-color: #e83e8c; margin-left: 5px;" onclick="cadastrarECheckinVisitante(${ev.id})">Visitante</button>`;
            }
        }

        tr.innerHTML = `<td><strong>${ev.nome}</strong></td><td>${ev.descricao}</td><td>${ev.local}</td><td>${acaoHTML}</td>`;
        tbody.appendChild(tr);
    });
}

// --- TELA 2: MINHAS INSCRIÇÕES (Gestão do Aluno) ---
async function carregarMinhasInscricoes() {
    const dados = await buscarDadosComCache();
    const tbody = document.getElementById('listaMinhasInscricoes');
    if (!tbody) return;
    tbody.innerHTML = "";

    const inscricoesAtivas = dados.inscricoes.filter(i => i.status === 'ATIVA');

    if (inscricoesAtivas.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>Você ainda não se inscreveu em nenhum evento.</td></tr>";
        return;
    }

    inscricoesAtivas.forEach(inscricao => {
        // Fallback para pegar dados do evento
        let evento = inscricao.evento;
        if (!evento) {
            evento = dados.eventos.find(e => e.id === inscricao.eventoId) || { nome: "Evento Desconhecido", descricao: "-", local: "-", id: inscricao.eventoId };
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${evento.nome}</strong></td>
            <td>${evento.descricao}</td>
            <td>${evento.local}</td>
            <td>
                <button class="btn-checkin" onclick="checkin(${evento.id})">Check-in</button>
                <button class="btn-cert" onclick="certificado(${evento.id}, '${evento.nome}')">Certificado</button>
                <button class="btn-cancelar" onclick="cancelarInscricao(${inscricao.id})">Cancelar Inscrição</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- AÇÕES DO USUÁRIO ---

async function inscrever(eventoId) {
    const usuarioId = localStorage.getItem('usuarioId');
    if(await processarAcao(APIS.INSCRICOES, { usuarioId, eventoId }, "Inscrição")) {
        const email = localStorage.getItem('email');
        enviarNotificacao(email, "Inscrição Confirmada", "Você foi inscrito no evento com sucesso!");
        window.location.reload(); 
    }
}

async function cancelarInscricao(inscricaoId) {
    if(!confirm("Tem certeza que deseja cancelar sua inscrição?")) return;
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${APIS.INSCRICOES}/${inscricaoId}`, {
            method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (res.ok) {
            alert("Inscrição cancelada com sucesso.");
            const email = localStorage.getItem('email');
            enviarNotificacao(email, "Cancelamento", "Sua inscrição foi cancelada.");
            window.location.reload(); 
        } else {
            alert("Erro ao cancelar.");
        }
    } catch (e) {
        alert("Erro de conexão. Não é possível cancelar inscrições em modo Offline.");
    }
}

async function checkin(eventoId) {
    const usuarioId = localStorage.getItem('usuarioId');
    if(await processarAcao(APIS.PRESENCAS, { usuarioId, eventoId }, "Check-in")) {
        const email = localStorage.getItem('email');
        enviarNotificacao(email, "Bem-vindo!", "Seu check-in foi registrado. Bom evento!");
    }
}

async function certificado(eventoId, nomeEvento) {
    const usuarioId = localStorage.getItem('usuarioId');
    const token = localStorage.getItem('token');
    
    const nomeEventoPDF = nomeEvento || "Evento Acadêmico"; 

    try {
        // 1. Busca os dados do Certificado (Gera UUID)
        const response = await fetch(APIS.CERTIFICADOS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ usuarioId, eventoId })
        });
        
        if(response.ok) {
            const data = await response.json();
            const codigo = data.codigoAutenticacao;
            const dataEmissao = new Date().toLocaleDateString('pt-BR');

            // 2. BUSCA O NOME REAL DO USUÁRIO (A novidade aqui!)
            let nomeReal = "Participante";
            try {
                const resUser = await fetch(`${APIS.USUARIOS}/${usuarioId}`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (resUser.ok) {
                    const dadosUser = await resUser.json();
                    nomeReal = dadosUser.nome; // Pega o nome do banco de dados
                }
            } catch (err) { console.error("Erro ao buscar nome", err); }

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

// --- FUNÇÃO GERADORA DE PDF ---
function gerarPDF(nome, evento, data, codigo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    // Borda (Margem)
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190);

    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(0, 51, 102); // Azul Marinho
    doc.text("CERTIFICADO", 148.5, 40, null, null, "center");

    // Corpo do Texto
    doc.setFontSize(20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0); // Preto
    doc.text("Certificamos que", 148.5, 70, null, null, "center");

    // Nome do Participante (Destaque)
    doc.setFontSize(30);
    doc.setFont("times", "bolditalic");
    doc.text(nome, 148.5, 90, null, null, "center");

    doc.setFontSize(20);
    doc.setFont("helvetica", "normal");
    doc.text("participou com êxito do evento", 148.5, 110, null, null, "center");

    // Nome do Evento
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text(evento, 148.5, 130, null, null, "center");

    // Data (Subimos para não bater no rodapé)
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Data de Emissão: ${data}`, 20, 160);
    
    // Rodapé (Código de Validação) - Agora em preto e mais para cima
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0); // PRETO (Antes estava cinza 100)
    
    doc.text(`Código de Autenticidade: ${codigo}`, 148.5, 180, null, null, "center");
    
    // Link de validação (Quebra de linha se necessário, mas aqui subimos a posição)
    const linkValidacao = `Verifique em: http://177.44.248.77/certificados/validar/${codigo}`;
    doc.text(linkValidacao, 148.5, 188, null, null, "center");

    doc.save(`Certificado_${evento}.pdf`);
}

async function alterarSenha() {
    const novaSenha = prompt("Digite sua nova senha:");
    if (!novaSenha) return;

    const usuarioId = localStorage.getItem('usuarioId');
    const token = localStorage.getItem('token');

    try {
        // 1. Busca dados atuais
        const resGet = await fetch(`${APIS.USUARIOS}/${usuarioId}`, {
            method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!resGet.ok) throw new Error("Erro ao buscar dados.");
        
        const usuarioAtual = await resGet.json();
        usuarioAtual.senha = novaSenha;

        // 2. Atualiza
        const resPut = await fetch(`${APIS.USUARIOS}/${usuarioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(usuarioAtual)
        });

        if (resPut.ok) {
            alert("Senha alterada! Faça login novamente.");
            logout();
        } else { alert("Erro ao alterar senha."); }
    } catch (erro) { alert("Erro técnico: " + erro.message); }
}

// Função genérica para POST (Inscrição/Presença) com suporte a Fila Offline
async function processarAcao(url, corpo, tipoAcao) {
    const token = localStorage.getItem('token');
    try {
        if(token === 'TOKEN_OFFLINE') throw new Error("Modo Offline");
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(corpo)
        });

        if (response.ok) {
            alert(`${tipoAcao} realizado com sucesso!`);
            return true;
        } else {
            const erro = await response.text();
            alert(`Atenção: ${erro}`);
            return false;
        }
    } catch (err) {
        salvarNaFila(tipoAcao, url, corpo);
        alert(`Sem conexão. ${tipoAcao} salvo no dispositivo!`);
        verificarPendencias();
        return false;
    }
}

// --- FLUXO DE VISITANTE RÁPIDO (STAFF) ---
async function cadastrarECheckinVisitante(eventoId) {
    const nome = prompt("Nome do Visitante:"); if (!nome) return;
    const email = prompt("E-mail do Visitante:"); if (!email) return;
    
    // Senha fixa para agilidade
    const senha = "123456";

    alert("Processando cadastro rápido...");
    try {
        // 1. Criar Usuário
        const resCriar = await fetch(APIS.USUARIOS, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        // Ignora erro se já existe (status 400), tenta logar igual
        if (!resCriar.ok && resCriar.status !== 400) throw new Error("Erro ao criar usuário.");

        // 2. Autenticar (para pegar o ID real)
        const resAuth = await fetch(APIS.AUTH, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        if (!resAuth.ok) throw new Error("Falha na autenticação do visitante.");
        
        const dataAuth = await resAuth.json();
        const tokenVisitante = dataAuth.token;
        const idVisitante = lerIdDoToken(tokenVisitante);

        // 3. Inscrever
        await fetch(APIS.INSCRICOES, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenVisitante },
            body: JSON.stringify({ usuarioId: idVisitante, eventoId })
        });

        // 4. Check-in
        const resPresenca = await fetch(APIS.PRESENCAS, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenVisitante },
            body: JSON.stringify({ usuarioId: idVisitante, eventoId })
        });

        if (resPresenca.ok) {
            alert(`✅ SUCESSO!\n\nVisitante: ${nome}\nStatus: Inscrito e Presença Confirmada.\n\nAvise o visitante: Senha provisória 123456`);
            enviarNotificacao(email, "Acesso EventHub", `Bem-vindo ${nome}! Sua senha provisória é: 123456`);
        } else {
            alert("Aviso: " + await resPresenca.text());
        }
    } catch (e) { alert("Erro: " + e.message); }
}

// --- LÓGICA DA PÁGINA DE LOGIN ---
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
                // Salva credenciais para login offline futuro
                localStorage.setItem('user_offline_' + email, senha);
                window.location.href = 'dashboard.html';
            } else {
                msg.innerText = "E-mail ou senha inválidos.";
            }
        } catch (err) {
            // Tentativa de Login Offline
            if(localStorage.getItem('user_offline_' + email) === senha) {
                salvarSessao('TOKEN_OFFLINE', email);
                window.location.href = 'dashboard.html';
            } else {
                msg.innerText = "Erro de conexão e sem dados locais.";
            }
        }
    });
}

// --- LÓGICA DA PÁGINA DE CADASTRO ---
const cadastroForm = document.getElementById('cadastroForm');
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        try {
            const response = await fetch(APIS.USUARIOS, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha })
            });

            if (response.ok) {
                alert("Cadastro realizado com sucesso! Faça login.");
                localStorage.setItem('user_offline_' + email, senha);
                window.location.href = 'index.html';
            } else {
                alert("Erro ao cadastrar.");
            }
        } catch (err) {
            // Cadastro Offline
            localStorage.setItem('user_offline_' + email, senha);
            alert("Sem internet. Usuário salvo localmente! Você pode logar.");
            window.location.href = 'index.html';
        }
    });
}

// --- SINCRONIZAÇÃO (Modo Offline -> Online) ---
function salvarNaFila(tipo, url, corpo) {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    fila.push({ tipo, url, corpo });
    localStorage.setItem('fila_sync', JSON.stringify(fila));
}

function verificarPendencias() {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    const btn = document.getElementById('btnSync');
    if(btn) {
        if(fila.length > 0) { 
            btn.style.display = 'inline-block'; 
            btn.innerText = `Sincronizar (${fila.length})`; 
        } else { 
            btn.style.display = 'none'; 
        }
    }
}

async function sincronizar() {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    if(fila.length === 0) return;

    if(!confirm("Deseja enviar os dados pendentes para a nuvem?")) return;

    const token = localStorage.getItem('token');
    // Se estiver com token offline, pede para relogar
    if(token === 'TOKEN_OFFLINE') {
        alert("Você está em modo Offline. Por favor, faça Logout e Login novamente com internet para sincronizar.");
        return;
    }

    let sucessos = 0;
    const novaFila = [];

    const btn = document.getElementById('btnSync');
    btn.innerText = "Enviando...";
    btn.disabled = true;

    for (const item of fila) {
        try {
            const response = await fetch(item.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(item.corpo)
            });

            // Se der 200 (OK), 400 (Já existe/Duplicado) ou 409 (Conflito), consideramos resolvido e tiramos da fila.
            // Se der 500 ou erro de rede, mantemos na fila.
            if(response.ok || response.status === 400 || response.status === 409) {
                sucessos++;
            } else {
                novaFila.push(item);
            }
        } catch (err) {
            novaFila.push(item);
        }
    }

    localStorage.setItem('fila_sync', JSON.stringify(novaFila));
    alert(`Sincronização finalizada! ${sucessos} itens processados.`);
    
    btn.disabled = false;
    verificarPendencias();
    window.location.reload();
}

function sincronizarAutomatico() {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    if(fila.length > 0) verificarPendencias();
}